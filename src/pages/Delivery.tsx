import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MapPin, 
  Phone, 
  Check, 
  X as XIcon, 
  Navigation,
  Clock,
  User as UserIcon,
  Map as MapIcon,
  List as ListIcon,
  Zap
} from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, DeliveryOrder } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap, 
  useMapsLibrary,
  InfoWindow
} from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface DeliveryProps {
  profile: UserProfile | null;
}

export function Delivery({ profile }: DeliveryProps) {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);

  useEffect(() => {
    if (!profile) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('deliveryStaffId', '==', profile.uid),
      where('date', '==', today)
    );

    const unsubscribe = onSnapshot(ordersQuery, async (snapshot) => {
      const ordersData = await Promise.all(snapshot.docs.map(async (orderDoc) => {
        const data = orderDoc.data() as DeliveryOrder;
        const customerSnap = await getDoc(doc(db, 'users', data.customerId));
        const customerData = customerSnap.data() as UserProfile;
        
        return { 
          id: orderDoc.id, 
          ...data,
          customerName: customerData?.name,
          customerAddress: customerData?.address,
          location: customerData?.location
        };
      }));
      
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const markDelivered = async (order: DeliveryOrder) => {
    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'delivered',
        deliveredAt: serverTimestamp()
      });

      const customerRef = doc(db, 'users', order.customerId);
      const pricePerLiter = 250;
      const totalAmount = order.quantity * pricePerLiter;
      
      const customerSnap = await getDoc(customerRef);
      const currentBalance = customerSnap.data()?.walletBalance || 0;

      await updateDoc(customerRef, {
        walletBalance: currentBalance - totalAmount
      });

      await addDoc(collection(db, 'transactions'), {
        customerId: order.customerId,
        amount: totalAmount,
        type: 'deduction',
        description: `Milk delivery (${order.quantity}L)`,
        timestamp: serverTimestamp(),
        orderId: order.id
      });

    } catch (error) {
      console.error('Failed to mark delivered:', error);
    }
  };

  const markMissed = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'missed'
      });
    } catch (error) {
      console.error('Failed to mark missed:', error);
    }
  };

  if (!hasValidKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
            <MapIcon size={40} />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Google Maps API Key Required</h2>
          <p className="text-stone-500">To enable route optimization and live tracking, please add your API key.</p>
          <div className="bg-stone-50 p-6 rounded-2xl text-left space-y-4 border border-stone-200">
            <p className="text-sm font-bold text-stone-700 uppercase tracking-widest">Setup Instructions:</p>
            <ol className="text-sm text-stone-600 space-y-2 list-decimal ml-4">
              <li>Get an API key from the <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener" className="text-emerald-600 font-bold underline">Google Cloud Console</a>.</li>
              <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right).</li>
              <li>Select <strong>Secrets</strong>.</li>
              <li>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code> and paste your key.</li>
            </ol>
          </div>
          <p className="text-xs text-stone-400 italic">The app will rebuild automatically after adding the secret.</p>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const completedOrders = orders.filter(o => o.status !== 'pending');

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Today's Route</h2>
            <p className="text-stone-500">Optimizing delivery for {pendingOrders.length} customers.</p>
          </div>
          <div className="flex gap-2 p-1 bg-stone-100 rounded-2xl w-fit">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all",
                viewMode === 'list' ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"
              )}
            >
              <ListIcon size={18} /> List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all",
                viewMode === 'map' ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"
              )}
            >
              <MapIcon size={18} /> Map
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="space-y-6">
            {pendingOrders.map((order, index) => (
              <div key={order.id} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                <div className="bg-emerald-50 md:w-16 flex items-center justify-center p-4 md:p-0">
                  <span className="text-2xl font-black text-emerald-700 opacity-50">#{index + 1}</span>
                </div>
                <div className="flex-1 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-600">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-stone-900">{order.customerName}</h4>
                        <p className="text-stone-500 font-medium flex items-center gap-1">
                          <MapPin size={14} /> {order.customerAddress}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="bg-stone-100 text-stone-700 px-4 py-2 rounded-xl font-bold text-lg">
                        {order.quantity} Liters
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => markMissed(order.id)}
                      className="flex-1 md:flex-none px-6 py-4 rounded-2xl border border-red-100 text-red-600 font-bold hover:bg-red-50"
                    >
                      Missed
                    </button>
                    <button 
                      onClick={() => markDelivered(order)}
                      className="flex-1 md:flex-none px-8 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                    >
                      Delivered
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingOrders.length === 0 && (
              <div className="py-20 text-center bg-white rounded-3xl border border-stone-200">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
                  <Check size={40} />
                </div>
                <h3 className="text-xl font-bold text-stone-900">All deliveries completed!</h3>
              </div>
            )}
          </div>
        ) : (
          <div className="h-[600px] rounded-3xl border border-stone-200 overflow-hidden relative shadow-inner">
            <Map
              defaultCenter={{ lat: 37.42, lng: -122.08 }}
              defaultZoom={13}
              mapId="DELIVERY_MAP"
              {...({ internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'] } as any)}
              style={{ width: '100%', height: '100%' }}
            >
              <RouteOptimizer orders={pendingOrders} onOrderClick={setSelectedOrder} />
            </Map>
            {selectedOrder && (
              <div className="absolute bottom-6 left-6 right-6 bg-white p-6 rounded-3xl shadow-2xl border border-stone-100 animate-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                      {selectedOrder.customerName?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900">{selectedOrder.customerName}</h4>
                      <p className="text-xs text-stone-500">{selectedOrder.customerAddress}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="text-stone-400 hover:text-stone-600">
                    <XIcon size={20} />
                  </button>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => markDelivered(selectedOrder)}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                  >
                    Confirm Delivery
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </APIProvider>
  );
}

function RouteOptimizer({ orders, onOrderClick }: { orders: DeliveryOrder[], onOrderClick: (o: DeliveryOrder) => void }) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeRoute = useCallback(async () => {
    if (!routesLib || !map || orders.length < 2) return;
    setIsOptimizing(true);

    // Clear previous route
    polylinesRef.current.forEach(p => p.setMap(null));

    // For this demo, we use the first order as origin and last as destination
    // In a real app, origin would be the farm/outlet location
    const origin = orders[0].location || { lat: 37.42, lng: -122.08 };
    const destination = orders[orders.length - 1].location || origin;
    const intermediates = orders.slice(1, -1).map(o => ({
      location: { latLng: o.location || origin }
    }));

    try {
      const { routes } = await (routesLib as any).Route.computeRoutes({
        origin: { latLng: origin },
        destination: { latLng: destination },
        intermediates: intermediates,
        travelMode: 'DRIVING',
        routingPreference: 'TRAFFIC_AWARE',
        optimizeWaypointOrder: true,
        extraComputations: ['TRAFFIC_ON_POLYLINE'] as any,
        fields: ['path', 'speedPaths', 'distanceMeters', 'durationMillis', 'viewport', 'optimizedIntermediateWaypointIndex'],
      });

      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => p.setMap(map));
        polylinesRef.current = newPolylines;
        if (routes[0].viewport) map.fitBounds(routes[0].viewport);
      }
    } catch (error) {
      console.error('Route optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [routesLib, map, orders]);

  useEffect(() => {
    optimizeRoute();
  }, [optimizeRoute]);

  return (
    <>
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={optimizeRoute}
          disabled={isOptimizing}
          className="bg-white px-4 py-2 rounded-xl shadow-lg border border-stone-100 text-emerald-600 font-bold flex items-center gap-2 hover:bg-emerald-50 transition-all disabled:opacity-50"
        >
          <Zap size={18} className={isOptimizing ? "animate-pulse" : ""} />
          {isOptimizing ? "Optimizing..." : "Optimize Route"}
        </button>
      </div>
      {orders.map((order, idx) => (
        <AdvancedMarker 
          key={order.id} 
          position={order.location || { lat: 37.42, lng: -122.08 }}
          onClick={() => onOrderClick(order)}
        >
          <div className="relative group">
            <Pin background={idx === 0 ? "#3b82f6" : "#10b981"} glyphColor="#fff" scale={1.2} />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {order.customerName}
            </div>
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}

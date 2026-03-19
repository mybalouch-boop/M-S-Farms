import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, DeliveryOrder, Transaction } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface DashboardProps {
  profile: UserProfile | null;
}

export function Dashboard({ profile }: DashboardProps) {
  const [todayOrders, setTodayOrders] = useState<DeliveryOrder[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isRecharging, setIsRecharging] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'jazzcash' | 'easypaisa' | 'bank'>('jazzcash');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Fetch today's orders
    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerId', '==', profile.uid),
      where('date', '==', today)
    );

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setTodayOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryOrder)));
    });

    // Fetch recent transactions
    const txQuery = query(
      collection(db, 'transactions'),
      where('customerId', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      setRecentTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeTx();
    };
  }, [profile]);

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !rechargeAmount) return;

    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsProcessing(true);
    try {
      // Call server-side API for payment initialization
      const response = await fetch('/api/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.uid,
          amount,
          paymentMethod,
          email: profile.email,
          phone: profile.phone
        })
      });

      if (!response.ok) {
        throw new Error('Payment initialization failed');
      }

      const data = await response.json();
      
      // In a real integration, you would redirect to the payment gateway URL
      // or handle the response according to the provider's SDK.
      // For this demo, we'll simulate a successful payment after a short delay.
      
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      // Simulated success for demo purposes if no redirect URL is provided
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Add transaction
      await addDoc(collection(db, 'transactions'), {
        customerId: profile.uid,
        amount,
        type: 'recharge',
        description: `Wallet recharge via ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}`,
        timestamp: serverTimestamp()
      });

      // Update user balance
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        walletBalance: increment(amount)
      });

      setRechargeAmount('');
      setIsRecharging(false);
    } catch (error) {
      console.error('Recharge failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Welcome back, {profile?.name}</h2>
          <p className="text-stone-500">Here's what's happening with your milk delivery today.</p>
        </div>
        <button 
          onClick={() => setIsRecharging(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus size={20} />
          Recharge Wallet
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Wallet size={24} />
            </div>
            {profile?.walletBalance !== undefined && profile.walletBalance < 100 && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                <AlertCircle size={12} /> Low Balance
              </span>
            )}
          </div>
          <p className="text-stone-500 text-sm font-medium uppercase tracking-wider">Wallet Balance</p>
          <h3 className="text-4xl font-bold text-stone-900 mt-1">Rs. {profile?.walletBalance?.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-stone-500 text-sm font-medium uppercase tracking-wider">Today's Delivery</p>
          <h3 className="text-4xl font-bold text-stone-900 mt-1">
            {todayOrders.length > 0 ? `${todayOrders[0].quantity} Liters` : 'No Delivery'}
          </h3>
          <p className="text-stone-400 text-xs mt-2 flex items-center gap-1">
            <Clock size={12} /> Scheduled for 6:30 AM
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-stone-50 text-stone-600 rounded-2xl">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <p className="text-stone-500 text-sm font-medium uppercase tracking-wider">Delivery Status</p>
          <h3 className={cn(
            "text-4xl font-bold mt-1 capitalize",
            todayOrders[0]?.status === 'delivered' ? "text-emerald-600" : "text-stone-400"
          )}>
            {todayOrders[0]?.status || 'Pending'}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <h4 className="text-xl font-bold text-stone-900">Recent Transactions</h4>
            <button className="text-emerald-600 text-sm font-semibold hover:underline">View All</button>
          </div>
          <div className="divide-y divide-stone-50">
            {recentTransactions.length > 0 ? (
              recentTransactions.map(tx => (
                <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-xl",
                      tx.type === 'recharge' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {tx.type === 'recharge' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div>
                      <p className="text-stone-900 font-semibold">{tx.description}</p>
                      <p className="text-stone-400 text-xs">{tx.timestamp ? format((tx.timestamp as any).toDate(), 'MMM dd, yyyy • hh:mm a') : 'Just now'}</p>
                    </div>
                  </div>
                  <p className={cn(
                    "font-bold text-lg",
                    tx.type === 'recharge' ? "text-emerald-600" : "text-stone-900"
                  )}>
                    {tx.type === 'recharge' ? '+' : '-'} Rs. {tx.amount}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-stone-400">No transactions found.</div>
            )}
          </div>
        </div>

        {/* Quick Actions / Info */}
        <div className="space-y-6">
          <div className="bg-emerald-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-xl shadow-emerald-900/20">
            <div className="relative z-10">
              <h4 className="text-2xl font-bold mb-2">Premium Quality Milk</h4>
              <p className="text-emerald-100 mb-6 opacity-80">Fresh from our farm to your doorstep every morning. Pure, organic, and healthy.</p>
              <button className="bg-white text-emerald-900 px-6 py-3 rounded-2xl font-bold hover:bg-emerald-50 transition-all">
                Learn More
              </button>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-800 rounded-full opacity-50 blur-3xl" />
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
            <h4 className="text-lg font-bold text-stone-900 mb-4">Support & Feedback</h4>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 rounded-xl border border-stone-100 hover:bg-stone-50 transition-all flex items-center justify-between group">
                <span className="text-stone-600 font-medium">Report a missed delivery</span>
                <ArrowUpRight size={18} className="text-stone-300 group-hover:text-emerald-600 transition-all" />
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl border border-stone-100 hover:bg-stone-50 transition-all flex items-center justify-between group">
                <span className="text-stone-600 font-medium">Change delivery address</span>
                <ArrowUpRight size={18} className="text-stone-300 group-hover:text-emerald-600 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recharge Modal */}
      {isRecharging && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-stone-900">Recharge Wallet</h3>
                <button onClick={() => setIsRecharging(false)} className="text-stone-400 hover:text-stone-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleRecharge} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'jazzcash', label: 'JazzCash', color: 'border-red-200 bg-red-50 text-red-700' },
                      { id: 'easypaisa', label: 'EasyPaisa', color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                      { id: 'bank', label: 'Bank Transfer', color: 'border-blue-200 bg-blue-50 text-blue-700' }
                    ].map(method => (
                      <button 
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1",
                          paymentMethod === method.id 
                            ? method.color + " border-current shadow-sm" 
                            : "border-stone-100 text-stone-500 hover:bg-stone-50"
                        )}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'bank' && (
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-2">
                    <p className="text-xs font-bold text-blue-800 uppercase tracking-widest">Bank Details</p>
                    <div className="text-sm text-blue-700">
                      <p><strong>Bank:</strong> Meezan Bank</p>
                      <p><strong>Account:</strong> M&S Farms ERP</p>
                      <p><strong>IBAN:</strong> PK00 MEZN 0123 4567 8901 2345</p>
                    </div>
                    <p className="text-[10px] text-blue-500 italic">Please share a screenshot of the transfer with our support.</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Amount (Rs.)</label>
                  <input 
                    type="number" 
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-4 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 text-lg font-bold"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[500, 1000, 2000].map(amount => (
                    <button 
                      key={amount}
                      type="button"
                      onClick={() => setRechargeAmount(amount.toString())}
                      className="py-3 rounded-xl border border-stone-100 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 font-semibold transition-all"
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className={cn(
                    "w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2",
                    isProcessing && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay via ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}`
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3, 
  Package, 
  Plus, 
  Search,
  Filter,
  Download,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Settings,
  X,
  Clock,
  CheckCircle2,
  Wallet,
  Calendar
} from 'lucide-react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Subscription, DeliveryOrder, Inventory, Transaction } from '../types';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

interface AdminProps {
  profile: UserProfile | null;
}

export function Admin({ profile }: AdminProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [allTransactions, setAllTransactions] = useState<(Transaction & { customerName?: string })[]>([]);
  const tabs = [
    { id: 'overview', label: 'Overview', roles: ['admin', 'inventory_manager', 'delivery_manager'] },
    { id: 'customers', label: 'Customers', roles: ['admin', 'delivery_manager'] },
    { id: 'transactions', label: 'Transactions', roles: ['admin'] },
    { id: 'inventory', label: 'Inventory', roles: ['admin', 'inventory_manager'] },
    { id: 'reports', label: 'Reports', roles: ['admin'] },
  ] as const;

  const filteredTabs = tabs.filter(tab => profile && (tab.roles as readonly string[]).includes(profile.role));
  const [activeTab, setActiveTab] = useState<typeof tabs[number]['id']>(
    filteredTabs[0]?.id || 'overview'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const [customerOrders, setCustomerOrders] = useState<DeliveryOrder[]>([]);
  const [customerSubscriptions, setCustomerSubscriptions] = useState<Subscription[]>([]);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isAddingInventory, setIsAddingInventory] = useState(false);
  const [newInventory, setNewInventory] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    productionLiters: '',
    deliveredLiters: '',
    wastageLiters: ''
  });

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerOrders([]);
      setCustomerSubscriptions([]);
      setCustomerTransactions([]);
      return;
    }

    setIsLoadingDetails(true);
    const customerId = selectedCustomer.uid;

    // Fetch customer orders
    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerId', '==', customerId),
      orderBy('date', 'desc')
    );
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setCustomerOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeliveryOrder)));
    });

    // Fetch customer subscriptions
    const subsQuery = query(
      collection(db, 'subscriptions'),
      where('customerId', '==', customerId)
    );
    const unsubscribeSubs = onSnapshot(subsQuery, (snapshot) => {
      setCustomerSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription)));
    });

    // Fetch customer transactions
    const txQuery = query(
      collection(db, 'transactions'),
      where('customerId', '==', customerId),
      orderBy('timestamp', 'desc')
    );
    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      setCustomerTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setIsLoadingDetails(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeSubs();
      unsubscribeTx();
    };
  }, [selectedCustomer]);

  useEffect(() => {
    if (!profile || !(['admin', 'inventory_manager', 'delivery_manager'] as string[]).includes(profile.role)) return;

    // Fetch all users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    // Fetch inventory
    const unsubscribeInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inventory)));
    });

    // Fetch all transactions
    const txQuery = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeAllTx = onSnapshot(txQuery, async (snapshot) => {
      const txData = await Promise.all(snapshot.docs.map(async (txDoc) => {
        const data = txDoc.data() as Transaction;
        const customer = users.find(u => u.uid === data.customerId);
        return { 
          id: txDoc.id, 
          ...data,
          customerName: customer?.name || 'Unknown'
        };
      }));
      setAllTransactions(txData);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeInventory();
      unsubscribeAllTx();
    };
  }, [profile, users]);

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInventory.date || !newInventory.productionLiters) return;

    try {
      await addDoc(collection(db, 'inventory'), {
        date: newInventory.date,
        productionLiters: parseFloat(newInventory.productionLiters),
        deliveredLiters: parseFloat(newInventory.deliveredLiters || '0'),
        wastageLiters: parseFloat(newInventory.wastageLiters || '0'),
        timestamp: serverTimestamp()
      });
      setIsAddingInventory(false);
      setNewInventory({
        date: format(new Date(), 'yyyy-MM-dd'),
        productionLiters: '',
        deliveredLiters: '',
        wastageLiters: ''
      });
    } catch (error) {
      console.error('Error adding inventory:', error);
      alert('Failed to add inventory entry.');
    }
  };

  const stats = [
    { label: 'Total Customers', value: users.filter(u => u.role === 'customer').length, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Revenue', value: 'Rs. 450,000', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Daily Demand', value: '1,250L', icon: Package, color: 'bg-orange-50 text-orange-600' },
    { label: 'Active Subs', value: '342', icon: BarChart3, color: 'bg-purple-50 text-purple-600' },
  ];

  const chartData = [
    { name: 'Mon', demand: 1100, production: 1200 },
    { name: 'Tue', demand: 1150, production: 1200 },
    { name: 'Wed', demand: 1200, production: 1250 },
    { name: 'Thu', demand: 1250, production: 1300 },
    { name: 'Fri', demand: 1220, production: 1300 },
    { name: 'Sat', demand: 1300, production: 1400 },
    { name: 'Sun', demand: 1350, production: 1400 },
  ];

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Admin Dashboard</h2>
          <p className="text-stone-500">Manage operations, track growth, and optimize delivery routes.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center gap-2 bg-white border border-stone-200 text-stone-700 px-4 py-3 rounded-2xl font-semibold hover:bg-stone-50 transition-all">
            <Download size={20} />
            Export Report
          </button>
          <button className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
            <UserPlus size={20} />
            Add User
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-stone-100 rounded-2xl w-fit">
        {filteredTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all",
              activeTab === tab.id ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500 hover:text-stone-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(stat => (
              <div key={stat.label} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                <div className={cn("p-3 rounded-2xl w-fit mb-4", stat.color)}>
                  <stat.icon size={24} />
                </div>
                <p className="text-stone-500 text-sm font-medium uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-3xl font-bold text-stone-900 mt-1">{stat.value}</h3>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <h4 className="text-xl font-bold text-stone-900 mb-8">Demand vs Production</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area type="monotone" dataKey="demand" stroke="#10b981" fillOpacity={1} fill="url(#colorDemand)" strokeWidth={3} />
                    <Area type="monotone" dataKey="production" stroke="#3b82f6" fillOpacity={0} strokeWidth={3} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <h4 className="text-xl font-bold text-stone-900 mb-8">Revenue Growth</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#f5f5f4'}}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="demand" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              <input 
                type="text" 
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>
            <div className="flex gap-2">
              <button className="p-3 bg-stone-50 text-stone-600 rounded-xl hover:bg-stone-100 transition-all">
                <Filter size={20} />
              </button>
              <button className="p-3 bg-stone-50 text-stone-600 rounded-xl hover:bg-stone-100 transition-all">
                <Settings size={20} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-widest">
                  <th className="px-8 py-4">Customer</th>
                  <th className="px-8 py-4">Phone</th>
                  <th className="px-8 py-4">Wallet</th>
                  <th className="px-8 py-4">Role</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredUsers.map(user => (
                  <tr key={user.uid} className="hover:bg-stone-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-stone-900 font-bold">{user.name}</p>
                          <p className="text-stone-400 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-stone-600 font-medium">{user.phone || 'N/A'}</td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "font-bold",
                        user.walletBalance < 100 ? "text-red-600" : "text-stone-900"
                      )}>
                        Rs. {user.walletBalance?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                        user.role === 'admin' ? "bg-purple-50 text-purple-600" : 
                        user.role === 'delivery' ? "bg-blue-50 text-blue-600" : "bg-stone-100 text-stone-600"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setSelectedCustomer(user)}
                        className="text-stone-400 hover:text-emerald-600 transition-all"
                      >
                        <ArrowUpRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <h4 className="text-xl font-bold text-stone-900">All Transactions</h4>
            <div className="flex gap-2">
              <button className="p-3 bg-stone-50 text-stone-600 rounded-xl hover:bg-stone-100 transition-all">
                <Filter size={20} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-widest">
                  <th className="px-8 py-4">Customer</th>
                  <th className="px-8 py-4">Type</th>
                  <th className="px-8 py-4">Description</th>
                  <th className="px-8 py-4">Amount</th>
                  <th className="px-8 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {allTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="text-stone-900 font-bold">{tx.customerName}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                        tx.type === 'recharge' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      )}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-stone-600 text-sm">{tx.description}</td>
                    <td className="px-8 py-6">
                      <p className={cn(
                        "font-bold",
                        tx.type === 'recharge' ? "text-emerald-600" : "text-stone-900"
                      )}>
                        {tx.type === 'recharge' ? '+' : '-'} Rs. {tx.amount}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-stone-400 text-xs">
                      {tx.timestamp ? format((tx.timestamp as any).toDate(), 'MMM dd, yyyy • hh:mm a') : 'Just now'}
                    </td>
                  </tr>
                ))}
                {allTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-stone-400">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-8">
          {/* Inventory Trends Chart */}
          <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-xl font-bold text-stone-900">Inventory Trends</h4>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-stone-500 font-medium">Production</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs text-stone-500 font-medium">Delivered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs text-stone-500 font-medium">Wastage</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...inventory].sort((a, b) => a.date.localeCompare(b.date))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#a8a29e', fontSize: 10}}
                    tickFormatter={(val) => format(new Date(val), 'MMM dd')}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    labelFormatter={(val) => format(new Date(val), 'MMMM dd, yyyy')}
                  />
                  <Line type="monotone" dataKey="productionLiters" name="Production" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981'}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="deliveredLiters" name="Delivered" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="wastageLiters" name="Wastage" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h4 className="text-xl font-bold text-stone-900">Inventory Logs</h4>
              <button 
                onClick={() => setIsAddingInventory(true)}
                className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <Plus size={18} />
                Add Entry
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-widest">
                    <th className="px-8 py-4">Date</th>
                    <th className="px-8 py-4">Production (L)</th>
                    <th className="px-8 py-4">Delivered (L)</th>
                    <th className="px-8 py-4">Wastage (L)</th>
                    <th className="px-8 py-4">Efficiency</th>
                    <th className="px-8 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {[...inventory].sort((a, b) => b.date.localeCompare(a.date)).map(item => {
                    const efficiency = item.productionLiters > 0 
                      ? Math.round(((item.deliveredLiters || 0) / item.productionLiters) * 100) 
                      : 0;
                    
                    return (
                      <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-8 py-6 font-medium text-stone-600">
                          {format(new Date(item.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-8 py-6 font-bold text-stone-900">{item.productionLiters}L</td>
                        <td className="px-8 py-6 text-emerald-600 font-bold">{item.deliveredLiters || 0}L</td>
                        <td className="px-8 py-6 text-red-600 font-bold">{item.wastageLiters || 0}L</td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden w-24">
                              <div 
                                className={cn(
                                  "h-full rounded-full",
                                  efficiency > 90 ? "bg-emerald-500" : efficiency > 70 ? "bg-orange-500" : "bg-red-500"
                                )}
                                style={{ width: `${efficiency}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-stone-500">{efficiency}%</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full uppercase tracking-wider">
                            Reconciled
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-stone-400">No inventory records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Inventory Modal */}
      {isAddingInventory && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-stone-900">New Inventory Entry</h3>
              <button onClick={() => setIsAddingInventory(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddInventory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Date</label>
                <input 
                  type="date" 
                  required
                  value={newInventory.date}
                  onChange={(e) => setNewInventory({...newInventory, date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Production Liters</label>
                <input 
                  type="number" 
                  required
                  placeholder="0"
                  value={newInventory.productionLiters}
                  onChange={(e) => setNewInventory({...newInventory, productionLiters: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Delivered (L)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={newInventory.deliveredLiters}
                    onChange={(e) => setNewInventory({...newInventory, deliveredLiters: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Wastage (L)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={newInventory.wastageLiters}
                    onChange={(e) => setNewInventory({...newInventory, wastageLiters: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 mt-4"
              >
                Save Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-stone-50 w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-white p-6 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-stone-900">{selectedCustomer.name}</h3>
                  <p className="text-stone-500 text-sm">{selectedCustomer.email} • {selectedCustomer.phone || 'No phone'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg w-fit mb-3">
                    <Wallet size={20} />
                  </div>
                  <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Wallet Balance</p>
                  <h4 className="text-2xl font-bold text-stone-900 mt-1">Rs. {selectedCustomer.walletBalance?.toLocaleString()}</h4>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg w-fit mb-3">
                    <Package size={20} />
                  </div>
                  <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Total Orders</p>
                  <h4 className="text-2xl font-bold text-stone-900 mt-1">{customerOrders.length}</h4>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg w-fit mb-3">
                    <Calendar size={20} />
                  </div>
                  <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Active Subscriptions</p>
                  <h4 className="text-2xl font-bold text-stone-900 mt-1">{customerSubscriptions.filter(s => s.status === 'active').length}</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Subscriptions Section */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-stone-100 bg-stone-50/50">
                    <h5 className="font-bold text-stone-900 flex items-center gap-2">
                      <BarChart3 size={18} className="text-emerald-600" />
                      Subscriptions
                    </h5>
                  </div>
                  <div className="divide-y divide-stone-50 max-h-[300px] overflow-y-auto">
                    {customerSubscriptions.length > 0 ? (
                      customerSubscriptions.map(sub => (
                        <div key={sub.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-stone-900 capitalize">{sub.planType} Plan</p>
                            <p className="text-stone-400 text-xs">{sub.quantity}L per delivery</p>
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                            sub.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-400"
                          )}>
                            {sub.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-stone-400 text-sm">No subscriptions found.</div>
                    )}
                  </div>
                </div>

                {/* Transaction Logs Section */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-stone-100 bg-stone-50/50">
                    <h5 className="font-bold text-stone-900 flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-600" />
                      Transaction Logs
                    </h5>
                  </div>
                  <div className="divide-y divide-stone-50 max-h-[300px] overflow-y-auto">
                    {customerTransactions.length > 0 ? (
                      customerTransactions.map(tx => (
                        <div key={tx.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              tx.type === 'recharge' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                              {tx.type === 'recharge' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-stone-900">{tx.description}</p>
                              <p className="text-stone-400 text-[10px]">
                                {tx.timestamp ? format((tx.timestamp as any).toDate(), 'MMM dd, yyyy • hh:mm a') : 'Just now'}
                              </p>
                            </div>
                          </div>
                          <p className={cn(
                            "font-bold text-sm",
                            tx.type === 'recharge' ? "text-emerald-600" : "text-stone-900"
                          )}>
                            {tx.type === 'recharge' ? '+' : '-'} Rs. {tx.amount}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-stone-400 text-sm">No transactions found.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Past Orders Section */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-100 bg-stone-50/50">
                  <h5 className="font-bold text-stone-900 flex items-center gap-2">
                    <Clock size={18} className="text-emerald-600" />
                    Past Orders
                  </h5>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-[10px] font-bold uppercase tracking-widest">
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Quantity</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Delivered At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {customerOrders.length > 0 ? (
                        customerOrders.map(order => (
                          <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-stone-900">{order.date}</td>
                            <td className="px-6 py-4 text-sm font-bold text-stone-600">{order.quantity}L</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                                order.status === 'delivered' ? "bg-emerald-50 text-emerald-600" : 
                                order.status === 'pending' ? "bg-stone-100 text-stone-400" : "bg-red-50 text-red-600"
                              )}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-stone-400">
                              {order.deliveredAt ? format(new Date(order.deliveredAt), 'hh:mm a') : '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-stone-400 text-sm">No orders found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

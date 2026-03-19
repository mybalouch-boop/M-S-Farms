import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Pause, 
  Play, 
  Trash2, 
  Check,
  ChevronRight,
  Milk
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Subscription } from '../types';
import { cn } from '../lib/utils';
import { format, addDays } from 'date-fns';

interface SubscriptionsProps {
  profile: UserProfile | null;
}

export function Subscriptions({ profile }: SubscriptionsProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSub, setNewSub] = useState({
    planType: 'daily' as 'daily' | 'alternate' | 'custom',
    quantity: 1,
    customDays: [] as string[]
  });

  useEffect(() => {
    if (!profile) return;

    const subQuery = query(
      collection(db, 'subscriptions'),
      where('customerId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(subQuery, (snapshot) => {
      setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription)));
    });

    return () => unsubscribe();
  }, [profile]);

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await addDoc(collection(db, 'subscriptions'), {
        customerId: profile.uid,
        planType: newSub.planType,
        quantity: newSub.quantity,
        status: 'active',
        customDays: newSub.customDays,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        nextDeliveryDate: format(addDays(new Date(), 1), 'yyyy-MM-dd')
      });

      setIsAdding(false);
      setNewSub({ planType: 'daily', quantity: 1, customDays: [] });
    } catch (error) {
      console.error('Failed to add subscription:', error);
    }
  };

  const toggleStatus = async (sub: Subscription) => {
    const newStatus = sub.status === 'active' ? 'paused' : 'active';
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        status: newStatus
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const deleteSubscription = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    try {
      await deleteDoc(doc(db, 'subscriptions', id));
    } catch (error) {
      console.error('Failed to delete subscription:', error);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Your Subscriptions</h2>
          <p className="text-stone-500">Manage your milk delivery plans and schedule.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
        >
          <Plus size={20} />
          Add New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {subscriptions.map(sub => (
          <div key={sub.id} className={cn(
            "bg-white p-8 rounded-3xl border border-stone-200 shadow-sm transition-all relative overflow-hidden group",
            sub.status === 'paused' && "opacity-75 grayscale-[0.5]"
          )}>
            <div className="flex items-start justify-between mb-6">
              <div className={cn(
                "p-4 rounded-2xl",
                sub.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"
              )}>
                <Milk size={32} />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleStatus(sub)}
                  className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                  title={sub.status === 'active' ? 'Pause' : 'Resume'}
                >
                  {sub.status === 'active' ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button 
                  onClick={() => deleteSubscription(sub.id)}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Delete"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-1 mb-6">
              <p className="text-stone-400 text-sm font-bold uppercase tracking-widest">{sub.planType} Plan</p>
              <h3 className="text-3xl font-bold text-stone-900">{sub.quantity} Liters</h3>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-2 text-stone-600">
                <Calendar size={18} className="text-stone-400" />
                <span className="text-sm font-medium">Next Delivery: {sub.nextDeliveryDate}</span>
              </div>
              {sub.planType === 'custom' && sub.customDays && (
                <div className="flex flex-wrap gap-1">
                  {sub.customDays.map(day => (
                    <span key={day} className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-1 rounded-full uppercase">
                      {day.substring(0, 3)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-stone-100">
              <span className={cn(
                "text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider",
                sub.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
              )}>
                {sub.status}
              </span>
              <button className="text-emerald-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                Edit Details <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}

        {subscriptions.length === 0 && !isAdding && (
          <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center text-stone-300 mb-4">
              <Milk size={40} />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">No active subscriptions</h3>
            <p className="text-stone-500 max-w-xs mb-8">Start your fresh milk journey by subscribing to one of our premium plans.</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all"
            >
              Get Started
            </button>
          </div>
        )}
      </div>

      {/* Add Subscription Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-stone-900">New Subscription</h3>
                <button onClick={() => setIsAdding(false)} className="text-stone-400 hover:text-stone-600">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddSubscription} className="space-y-8">
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-stone-700 uppercase tracking-widest">Select Plan Type</label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['daily', 'alternate', 'custom'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewSub({ ...newSub, planType: type })}
                        className={cn(
                          "py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                          newSub.planType === type 
                            ? "bg-emerald-50 border-emerald-600 text-emerald-700" 
                            : "border-stone-100 text-stone-500 hover:border-stone-200"
                        )}
                      >
                        <span className="font-bold capitalize">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {newSub.planType === 'custom' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-stone-700 uppercase tracking-widest">Select Days</label>
                    <div className="flex flex-wrap gap-2">
                      {days.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const current = newSub.customDays;
                            const updated = current.includes(day) 
                              ? current.filter(d => d !== day) 
                              : [...current, day];
                            setNewSub({ ...newSub, customDays: updated });
                          }}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold transition-all border-2",
                            newSub.customDays.includes(day)
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-stone-100 text-stone-500 hover:border-stone-200"
                          )}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-stone-700 uppercase tracking-widest">Quantity (Liters)</label>
                  <div className="flex items-center gap-6">
                    <button 
                      type="button"
                      onClick={() => setNewSub({ ...newSub, quantity: Math.max(1, newSub.quantity - 0.5) })}
                      className="w-12 h-12 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50"
                    >-</button>
                    <span className="text-4xl font-bold text-stone-900 min-w-[80px] text-center">{newSub.quantity}</span>
                    <button 
                      type="button"
                      onClick={() => setNewSub({ ...newSub, quantity: newSub.quantity + 0.5 })}
                      className="w-12 h-12 rounded-xl border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50"
                    >+</button>
                  </div>
                </div>

                <div className="bg-stone-50 p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Estimated Monthly Cost</p>
                    <p className="text-2xl font-bold text-stone-900">Rs. {(newSub.quantity * 250 * 30).toLocaleString()}</p>
                  </div>
                  <Check className="text-emerald-600" size={32} />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                >
                  Start Subscription
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

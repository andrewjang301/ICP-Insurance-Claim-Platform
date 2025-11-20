import React, { useState, useEffect } from 'react';
import { 
  Claim, UserRole, ClaimStatus, Estimate 
} from '../types';
import { 
  Car, Calendar, AlertCircle, DollarSign, 
  CheckCircle, Wrench, MapPin, MessageSquare, 
  XCircle, Send, ShieldAlert
} from 'lucide-react';
import * as geminiService from '../services/geminiService';

interface Props {
  claim: Claim;
  userRole: UserRole;
  onUpdateClaim: (updatedClaim: Claim) => void;
}

export const ClaimDetail: React.FC<Props> = ({ claim, userRole, onUpdateClaim }) => {
  const [commentText, setCommentText] = useState('');
  const [negotiationAmount, setNegotiationAmount] = useState<string>('');
  const [negotiationReason, setNegotiationReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const isAgent = userRole === UserRole.InsuranceAgent;
  const isShop = userRole === UserRole.RepairShop;
  const isPolicyholder = userRole === UserRole.Policyholder;

  // Helpers
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  // --- Actions ---

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: Date.now().toString(),
      authorRole: userRole,
      authorName: userRole, // Simplified
      text: commentText,
      timestamp: Date.now()
    };
    onUpdateClaim({
      ...claim,
      comments: [...claim.comments, newComment]
    });
    setCommentText('');
  };

  const handleStatusChange = (newStatus: ClaimStatus) => {
    onUpdateClaim({ ...claim, status: newStatus });
  };

  const handleRejectClaim = () => {
    if(!rejectReason) return;
    const updatedClaim = { ...claim, status: ClaimStatus.Rejected };
    // Add rejection comment
    updatedClaim.comments.push({
      id: Date.now().toString(),
      authorRole: UserRole.InsuranceAgent,
      authorName: "Agent",
      text: `CLAIM REJECTED: ${rejectReason}`,
      timestamp: Date.now()
    });
    onUpdateClaim(updatedClaim);
    setRejectReason('');
  };

  const handleNegotiate = async () => {
    if (!negotiationAmount || !negotiationReason) return;
    setLoading(true);

    const amount = parseFloat(negotiationAmount);
    const newEstimate: Estimate = {
      totalCost: amount,
      laborCost: amount * 0.6, // Simplified split
      partsCost: amount * 0.4,
      details: negotiationReason,
      source: isAgent ? 'Insurance Agent' : 'Repair Shop'
    };

    // If shop proposes, we could run LLM judge here or just post it.
    // Let's simulate a "Judge" check if it's a huge jump, but for UI simplicity we just post.
    
    const updatedClaim = { ...claim };
    
    if (isShop) {
        updatedClaim.repairShopEstimate = newEstimate;
    } else if (isAgent) {
        updatedClaim.agentEstimate = newEstimate;
        updatedClaim.currentEstimate = newEstimate; // Agent overrides active estimate
    }

    updatedClaim.comments.push({
      id: Date.now().toString(),
      authorRole: userRole,
      authorName: userRole,
      text: `Proposed new estimate: ${formatCurrency(amount)}. Reason: ${negotiationReason}`,
      timestamp: Date.now()
    });

    onUpdateClaim(updatedClaim);
    setNegotiationAmount('');
    setNegotiationReason('');
    setLoading(false);
  };

  const handleApproveEstimate = () => {
    // Agent approves the current estimate
    onUpdateClaim({
      ...claim,
      status: ClaimStatus.Approved
    });
  };

  // --- Sections ---

  const renderStatusBadge = () => {
    const colors = {
      [ClaimStatus.Submitted]: 'bg-gray-100 text-gray-800',
      [ClaimStatus.AIReview]: 'bg-purple-100 text-purple-800',
      [ClaimStatus.Estimated]: 'bg-blue-100 text-blue-800',
      [ClaimStatus.Approved]: 'bg-green-100 text-green-800',
      [ClaimStatus.InRepair]: 'bg-orange-100 text-orange-800',
      [ClaimStatus.PickUpPending]: 'bg-yellow-100 text-yellow-800',
      [ClaimStatus.Closed]: 'bg-slate-800 text-white',
      [ClaimStatus.Rejected]: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[claim.status]}`}>
        {claim.status}
      </span>
    );
  };

  const renderEstimateCard = (est: Estimate | undefined, title: string, isActive: boolean) => {
    if (!est) return null;
    return (
      <div className={`p-4 rounded-lg border ${isActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'} mb-4`}>
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-slate-700">{title}</h4>
          <span className="text-xs text-slate-500 uppercase">{est.source}</span>
        </div>
        <div className="text-2xl font-bold text-slate-900 mb-2">{formatCurrency(est.totalCost)}</div>
        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
          <div>Labor: {formatCurrency(est.laborCost)}</div>
          <div>Parts: {formatCurrency(est.partsCost)}</div>
        </div>
        <p className="text-sm text-slate-500 italic">{est.details}</p>
      </div>
    );
  };

  const renderConfirmationActions = () => {
    return (
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-slate-800">
          <CheckCircle className="mr-2 text-green-600" /> Actions & Sign-Offs
        </h3>
        
        {/* Agent Actions */}
        {isAgent && claim.status === ClaimStatus.Estimated && (
          <div className="flex items-center justify-between">
            <p className="text-slate-600">Review AI Estimate and approve to proceed.</p>
            <button onClick={handleApproveEstimate} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition">
              Approve Estimate
            </button>
          </div>
        )}

        {/* Repair Shop Actions */}
        {isShop && claim.status === ClaimStatus.Approved && (
          <div className="flex items-center justify-between">
            <p className="text-slate-600">Vehicle received. Start repair process?</p>
            <button onClick={() => handleStatusChange(ClaimStatus.InRepair)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
              Start Repair
            </button>
          </div>
        )}
        {isShop && claim.status === ClaimStatus.InRepair && (
           <div className="flex items-center justify-between">
           <p className="text-slate-600">Is the repair work completed?</p>
           <button onClick={() => handleStatusChange(ClaimStatus.PickUpPending)} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition">
             Repair Completed
           </button>
         </div>
        )}

        {/* Policyholder Actions */}
        {isPolicyholder && claim.status === ClaimStatus.PickUpPending && (
           <div className="flex items-center justify-between">
           <p className="text-slate-600">Inspect your vehicle. Confirm pickup to close claim.</p>
           <button onClick={() => handleStatusChange(ClaimStatus.Closed)} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-medium transition">
             Inspection & Pick Up Completed
           </button>
         </div>
        )}
        
        {!((isAgent && claim.status === ClaimStatus.Estimated) ||
           (isShop && [ClaimStatus.Approved, ClaimStatus.InRepair].includes(claim.status)) ||
           (isPolicyholder && claim.status === ClaimStatus.PickUpPending)) && (
             <p className="text-slate-500 italic text-sm">No pending actions for you at this stage.</p>
           )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">Claim #{claim.policyNumber.split('-')[1] || claim.id}</h1>
            {renderStatusBadge()}
          </div>
          <p className="text-slate-500 flex items-center">
            <Car size={16} className="mr-1" /> {claim.vehicleYear} {claim.vehicleModel} 
            <span className="mx-2">•</span>
            <Calendar size={16} className="mr-1" /> {formatDate(claim.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Media */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Media Grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-semibold mb-3 text-slate-700">Damage Documentation</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {claim.damageImages.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-slate-200">
                  <img src={`data:image/jpeg;base64,${img}`} alt="Damage" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
             <p className="mt-3 text-slate-600 text-sm bg-slate-50 p-3 rounded-lg">
               <span className="font-bold">User Report:</span> {claim.accidentDetails}
             </p>
          </div>

          {/* AI Assessment */}
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldAlert size={100} />
            </div>
            <h3 className="text-lg font-bold text-indigo-900 mb-2 flex items-center">
                <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded mr-2">AICA</span>
                AI Damage Assessment
            </h3>
            {claim.status === ClaimStatus.Submitted ? (
               <div className="flex items-center text-indigo-700 py-4">
                 <Loader2 className="animate-spin mr-2" /> Analyzing damage with Gemini 2.5...
               </div>
            ) : (
              <div className="prose prose-indigo text-sm">
                <p className="whitespace-pre-line text-indigo-800">{claim.aiDamageAssessment || "Assessment pending..."}</p>
              </div>
            )}
          </div>

          {/* Suggested Shops (Policyholder Only) */}
          {isPolicyholder && claim.suggestedShops && claim.suggestedShops.length > 0 && (
             <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
               <h3 className="text-lg font-semibold mb-4 flex items-center">
                 <MapPin className="mr-2 text-blue-500" /> Suggested Authorized Repair Shops
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {claim.suggestedShops.map((shop, idx) => (
                   <div key={idx} className="border p-3 rounded-lg hover:border-blue-300 transition">
                      <div className="font-bold text-slate-800">{shop.name}</div>
                      <div className="text-sm text-slate-600">{shop.address}</div>
                      {shop.rating && <div className="text-xs text-yellow-600 mt-1">★ {shop.rating} Rating</div>}
                      {shop.websiteUri && (
                        <a href={shop.websiteUri} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                          Visit Website
                        </a>
                      )}
                   </div>
                 ))}
               </div>
             </div>
          )}

          {/* Estimates Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center text-slate-800">
              <DollarSign className="mr-2 text-green-600" /> Cost Estimates
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {renderEstimateCard(claim.aiEstimate, "AI Initial Estimate", !claim.repairShopEstimate && !claim.agentEstimate)}
               {renderEstimateCard(claim.repairShopEstimate, "Repair Shop Estimate", !!claim.repairShopEstimate && (!claim.agentEstimate || claim.agentEstimate.source !== 'Insurance Agent'))}
               {renderEstimateCard(claim.agentEstimate, "Agent Final Estimate", !!claim.agentEstimate)}
            </div>

            {/* Negotiation Forms */}
            {(isShop || isAgent) && claim.status !== ClaimStatus.Closed && claim.status !== ClaimStatus.Rejected && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h4 className="font-medium text-slate-700 mb-3">
                  {isShop ? "Propose Adjustment" : "Negotiate / Adjust Estimate"}
                </h4>
                <div className="flex flex-col space-y-3">
                  <div className="flex space-x-4">
                    <div className="w-1/3">
                      <label className="text-xs text-slate-500">New Total Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500">$</span>
                        <input 
                          type="number" 
                          className="w-full pl-6 p-2 border rounded-lg bg-slate-50"
                          value={negotiationAmount}
                          onChange={(e) => setNegotiationAmount(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="w-2/3">
                       <label className="text-xs text-slate-500">Reason / Justification</label>
                       <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg bg-slate-50"
                        placeholder="e.g. Found internal structural damage..."
                        value={negotiationReason}
                        onChange={(e) => setNegotiationReason(e.target.value)}
                       />
                    </div>
                  </div>
                  <div className="flex justify-end">
                     <button 
                      onClick={handleNegotiate}
                      disabled={loading || !negotiationAmount || !negotiationReason}
                      className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700 disabled:opacity-50"
                     >
                       {loading ? 'Analyzing...' : 'Submit Adjustment'}
                     </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions, Comments, Status */}
        <div className="space-y-6">
          
          {/* Agent Rejection Block */}
          {isAgent && claim.status !== ClaimStatus.Closed && claim.status !== ClaimStatus.Rejected && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
               <h4 className="text-red-800 font-semibold mb-2 flex items-center"><XCircle size={16} className="mr-2"/> Deny Claim</h4>
               <textarea 
                 className="w-full p-2 border border-red-200 rounded bg-white text-sm mb-2"
                 placeholder="Reason for rejection..."
                 value={rejectReason}
                 onChange={e => setRejectReason(e.target.value)}
               />
               <button 
                onClick={handleRejectClaim}
                disabled={!rejectReason}
                className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
               >
                 Deny and Reject Claim
               </button>
            </div>
          )}

          {/* Confirmation Actions */}
          {renderConfirmationActions()}

          {/* Comments Feed */}
          <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-[500px] shadow-sm">
            <div className="p-4 border-b bg-slate-50 rounded-t-xl">
              <h3 className="font-semibold text-slate-700 flex items-center">
                <MessageSquare size={18} className="mr-2" /> Activity & Comments
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {claim.comments.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">No activity yet.</p>}
              {claim.comments.map((comment) => (
                <div key={comment.id} className={`flex flex-col ${comment.authorRole === userRole ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 ${comment.authorRole === userRole ? 'bg-blue-50 text-blue-900' : 'bg-gray-100 text-gray-800'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold mr-2">{comment.authorName}</span>
                      <span className="text-[10px] opacity-60">{new Date(comment.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t flex gap-2">
              <input 
                type="text" 
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button onClick={handleAddComment} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                <Send size={18} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

function Loader2({className}: {className?: string}) {
    return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
}
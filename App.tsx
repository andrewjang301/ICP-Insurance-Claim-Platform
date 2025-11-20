import React, { useState, useEffect } from 'react';
import { UserRole, Claim, ClaimStatus, CreateClaimData } from './types';
import { ClaimDetail } from './components/ClaimDetail';
import { CreateClaimModal } from './components/CreateClaimModal';
import * as geminiService from './services/geminiService';
import { 
  LayoutDashboard, 
  Plus, 
  Search, 
  ShieldCheck, 
  Wrench, 
  Users,
  LogOut
} from 'lucide-react';

// Mock Initial Data
const INITIAL_CLAIMS: Claim[] = [
  {
    id: '1',
    policyNumber: 'POL-883920',
    policyholderName: 'John Doe',
    vehicleModel: 'Honda Civic',
    vehicleYear: '2020',
    accidentDetails: 'Rear-ended at a stop sign. Bumper dented.',
    status: ClaimStatus.Estimated,
    damageImages: [], // In real app, these would be URLs
    aiDamageAssessment: 'Observed significant denting on rear bumper cover. Impact absorber likely compromised. Trunk lid alignment appears normal.',
    aiEstimate: {
      totalCost: 1200,
      laborCost: 500,
      partsCost: 700,
      details: 'Replace Rear Bumper Cover, Replace Impact Absorber, Paint & Blend.',
      source: 'AI'
    },
    currentEstimate: {
      totalCost: 1200,
      laborCost: 500,
      partsCost: 700,
      details: 'Replace Rear Bumper Cover, Replace Impact Absorber, Paint & Blend.',
      source: 'AI'
    },
    comments: [
      { id: 'c1', authorRole: UserRole.Policyholder, authorName: 'John Doe', text: 'Happened yesterday around 5pm.', timestamp: Date.now() - 100000 }
    ],
    createdAt: Date.now() - 200000,
    updatedAt: Date.now(),
    suggestedShops: [
       { name: "Downtown Auto Fix", address: "123 Main St", rating: "4.5" },
       { name: "Quick Collision", address: "44 Broadway", rating: "4.2" }
    ]
  }
];

const App: React.FC = () => {
  // State
  const [userRole, setUserRole] = useState<UserRole>(UserRole.Policyholder);
  const [claims, setClaims] = useState<Claim[]>(INITIAL_CLAIMS);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Computed
  const filteredClaims = claims.filter(c => 
    c.policyNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.includes(searchQuery)
  );
  
  const selectedClaim = claims.find(c => c.id === selectedClaimId);

  // Handlers
  const handleCreateClaim = async (data: CreateClaimData) => {
    // 1. Create Basic Claim Object
    const newId = Date.now().toString();
    const baseClaim: Claim = {
      id: newId,
      policyNumber: data.policyNumber,
      policyholderName: 'Current User', // Mocked
      vehicleModel: data.vehicleModel,
      vehicleYear: data.vehicleYear,
      accidentDetails: data.accidentDetails,
      status: ClaimStatus.AIReview, // Immediate transition to AI Review
      damageImages: [], // Will populate next
      comments: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Add to state immediately to show UI feedback
    setClaims(prev => [baseClaim, ...prev]);
    setSelectedClaimId(newId);

    try {
        // 2. Process Images
        // In a real app, we upload to cloud storage here. 
        // For demo, we keep base64 in memory.
        const processedImages = await Promise.all(
            data.images.map(async (file) => {
                const part = await geminiService.fileToGenerativePart(file);
                return part.inlineData.data;
            })
        );

        // 3. Call Gemini for Analysis
        const analysis = await geminiService.analyzeDamage(data.images, `${data.vehicleYear} ${data.vehicleModel}`);

        // 4. Get Shops
        const shops = await geminiService.findRepairShops("Current Location"); // Mock location

        // 5. Update Claim with AI Results
        setClaims(prev => prev.map(c => {
            if (c.id === newId) {
                return {
                    ...c,
                    damageImages: processedImages,
                    aiDamageAssessment: analysis.assessment,
                    aiEstimate: analysis.estimate,
                    currentEstimate: analysis.estimate,
                    suggestedShops: shops,
                    status: ClaimStatus.Estimated // Move to Estimated
                };
            }
            return c;
        }));

    } catch (e) {
        console.error("Error processing claim", e);
        // Fallback update if error
        setClaims(prev => prev.map(c => c.id === newId ? {...c, status: ClaimStatus.Submitted} : c));
    }
  };

  const handleUpdateClaim = (updatedClaim: Claim) => {
      setClaims(prev => prev.map(c => c.id === updatedClaim.id ? updatedClaim : c));
  };

  // Render Components
  const renderSidebar = () => (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search Claim #"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {userRole !== UserRole.RepairShop && (
        <div className="p-4 pb-0">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center font-medium transition"
          >
            <Plus size={18} className="mr-2" /> New Claim
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredClaims.map(claim => (
          <div
            key={claim.id}
            onClick={() => setSelectedClaimId(claim.id)}
            className={`p-3 rounded-lg cursor-pointer border transition ${
              selectedClaimId === claim.id 
                ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' 
                : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-semibold text-slate-800 text-sm">{claim.policyNumber}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                claim.status === ClaimStatus.Approved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {claim.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">{claim.vehicleYear} {claim.vehicleModel}</p>
            <p className="text-xs text-slate-400 mt-1">{new Date(claim.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const roleColor = {
    [UserRole.Policyholder]: 'bg-emerald-600',
    [UserRole.RepairShop]: 'bg-orange-600',
    [UserRole.InsuranceAgent]: 'bg-blue-800',
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top Navigation / Role Switcher (Demo Only) */}
      <header className={`${roleColor[userRole]} text-white px-6 py-3 flex justify-between items-center shadow-md z-10`}>
        <div className="flex items-center space-x-3">
          <ShieldCheck size={28} />
          <div>
            <h1 className="text-lg font-bold tracking-tight">ICP <span className="opacity-75 font-normal">| Insurance Claim Platform</span></h1>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex bg-black/20 rounded-lg p-1">
            {Object.values(UserRole).map((role) => (
               <button
                 key={role}
                 onClick={() => setUserRole(role)}
                 className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                   userRole === role ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:bg-white/10'
                 }`}
               >
                 {role}
               </button>
            ))}
          </div>
          <div className="flex items-center space-x-2">
             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
               <Users size={16} />
             </div>
             <div className="text-sm text-right hidden md:block">
               <div className="font-medium">Demo User</div>
               <div className="text-xs opacity-80">{userRole} Mode</div>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {renderSidebar()}
        
        <main className="flex-1 overflow-hidden relative">
          {selectedClaim ? (
            <ClaimDetail 
              claim={selectedClaim} 
              userRole={userRole} 
              onUpdateClaim={handleUpdateClaim} 
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <LayoutDashboard size={64} className="mb-4 opacity-50" />
              <p className="text-lg">Select a claim to view details</p>
            </div>
          )}
        </main>
      </div>

      <CreateClaimModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSubmit={handleCreateClaim}
      />
    </div>
  );
};

export default App;
export enum UserRole {
  Policyholder = 'Policyholder',
  RepairShop = 'Repair Shop',
  InsuranceAgent = 'Insurance Agent',
}

export enum ClaimStatus {
  Submitted = 'Submitted',
  AIReview = 'AI Review',
  Estimated = 'Estimated',
  Approved = 'Approved',
  InRepair = 'In Repair',
  PickUpPending = 'Pick Up Pending',
  Closed = 'Closed',
  Rejected = 'Rejected',
}

export interface Comment {
  id: string;
  authorRole: UserRole;
  authorName: string;
  text: string;
  timestamp: number;
}

export interface Estimate {
  totalCost: number;
  laborCost: number;
  partsCost: number;
  details: string;
  source: 'AI' | 'Repair Shop' | 'Insurance Agent';
}

export interface RepairShopSuggestion {
  name: string;
  address: string;
  rating?: string;
  websiteUri?: string;
}

export interface Claim {
  id: string;
  policyNumber: string;
  policyholderName: string;
  vehicleModel: string;
  vehicleYear: string;
  accidentDetails: string;
  status: ClaimStatus;
  
  // Media
  damageImages: string[]; // Base64 strings

  // AI Data
  aiDamageAssessment?: string;
  aiEstimate?: Estimate;
  aiConfidenceScore?: number; // 0-100

  // Shops
  suggestedShops?: RepairShopSuggestion[];

  // Estimates & Negotiation
  currentEstimate?: Estimate; // The active estimate being worked on
  repairShopEstimate?: Estimate; // Proposed by shop
  agentEstimate?: Estimate; // Proposed by agent
  
  // Comments/History
  comments: Comment[];

  // Dates
  createdAt: number;
  updatedAt: number;
}

export interface CreateClaimData {
  policyNumber: string;
  vehicleModel: string;
  vehicleYear: string;
  accidentDetails: string;
  images: File[];
}
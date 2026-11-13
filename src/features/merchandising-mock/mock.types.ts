import type { CustomerPlacement } from '../customer/merchandising';
export type MockRole = 'Merchandiser' | 'Store Admin';
export interface MockActor { role: MockRole }
export interface ApprovedGroup { id:string; storeId:string; title:string; items:{productId:string;quantity:number}[]; utility:number; approved:boolean }
export interface MockLayout { id:string; storeId:string; name:string; version:number; status:'DRAFT'|'PUBLISHED'; placements:CustomerPlacement[] }
export interface SimulationMetrics { orders:number; revenue:number; utility:number }
export interface SimulationResult { seed:number; visitors:number; a:SimulationMetrics; b:SimulationMetrics }
export interface MockCampaign { id:string; storeId:string; name:string; baselineId:string|null; proposedId:string; result:SimulationResult|null }
export interface MockState { schemaVersion:1; revision:number; layouts:MockLayout[]; campaigns:MockCampaign[]; activeByStore:Record<string,string> }

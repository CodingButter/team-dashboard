/**
 * Neo4j Graph Operations API Contracts
 * Types for graph database queries and operations
 */

import { ApiResponse } from './common';

export interface GraphEntity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

export interface GraphSearchQuery {
  query: string;
  entityTypes?: string[];
  limit?: number;
  offset?: number;
  includeRelationships?: boolean;
}

export interface GraphSearchResponse {
  entities: GraphEntity[];
  relationships?: GraphRelationship[];
  totalCount: number;
  searchTime: number;
}

export interface CypherQuery {
  query: string;
  parameters?: Record<string, any>;
  timeout?: number;
}

export interface CypherQueryResponse {
  columns: string[];
  data: any[][];
  stats?: {
    nodesCreated: number;
    nodesDeleted: number;
    relationshipsCreated: number;
    relationshipsDeleted: number;
    propertiesSet: number;
    labelsAdded: number;
    labelsRemoved: number;
  };
}

// Neo4j Graph API Endpoints
export interface GraphApiEndpoints {
  'GET /api/graph/search': (query: GraphSearchQuery) => Promise<ApiResponse<GraphSearchResponse>>;
  'GET /api/graph/entity/:id': (id: string) => Promise<ApiResponse<GraphEntity>>;
  'GET /api/graph/relationships': (entityId: string) => Promise<ApiResponse<GraphRelationship[]>>;
  'POST /api/graph/query': (body: CypherQuery) => Promise<ApiResponse<CypherQueryResponse>>;
}
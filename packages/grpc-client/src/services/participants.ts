// Merkle DAG: grpc.client.services.participants
// Participant service client

import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcTransport } from "../client";

// Generated types will be imported from src/generated after proto compilation
// import { ParticipantService } from "../generated/spirit_in_physics/participants/v1/participant_service_connect";
// import {
//   GetParticipantsRequest,
//   GetParticipantsResponse,
//   GetParticipantRequest,
//   GetParticipantResponse,
//   CreateParticipantRequest,
//   CreateParticipantResponse,
// } from "../generated/spirit_in_physics/participants/v1/participants_pb";

// Temporary placeholder - will be replaced with generated types
export interface Participant {
  id: string;
  age?: number;
  gender?: string;
  handedness?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetParticipantsRequest {}
export interface GetParticipantsResponse {
  participants: Participant[];
}

export interface GetParticipantRequest {
  id: string;
}
export interface GetParticipantResponse {
  participant?: Participant;
}

export interface CreateParticipantRequest {
  id?: string;
  signature: string;
  agreements: any; // JSON value
  agreedAt: string;
  isPublic?: boolean;
}
export interface CreateParticipantResponse {
  participant: Participant;
}

// Client wrapper
export class ParticipantServiceClient {
  // private client: ReturnType<typeof createPromiseClient<typeof ParticipantService>>;
  
  constructor(baseUrl?: string) {
    // const transport = createGrpcTransport(baseUrl);
    // this.client = createPromiseClient(ParticipantService, transport);
  }

  async getParticipants(): Promise<GetParticipantsResponse> {
    // return await this.client.getParticipants({});
    throw new Error("Not implemented - waiting for proto generation");
  }

  async getParticipant(id: string): Promise<GetParticipantResponse> {
    // return await this.client.getParticipant({ id });
    throw new Error("Not implemented - waiting for proto generation");
  }

  async createParticipant(request: CreateParticipantRequest): Promise<CreateParticipantResponse> {
    // return await this.client.createParticipant(request);
    throw new Error("Not implemented - waiting for proto generation");
  }
}


// Merkle DAG: unified.app.researcher.api.grpc
// Next.js API proxy route for gRPC-Web / Connect protocol requests

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get gRPC service URL
  const grpcUrl = process.env.GRPC_API_URL || "http://grpc-service:8083";
  
  // Get the service and method from the path
  // Connect protocol uses paths like: /spirit_in_physics.participants.v1.ParticipantService/GetParticipants
  const path = req.url?.replace("/api/grpc", "") || "";
  
  // Forward the request to the gRPC service
  try {
    const response = await fetch(`${grpcUrl}${path}`, {
      method: req.method,
      headers: {
        ...req.headers,
        host: undefined, // Remove host header
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
    });

    // Forward response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Handle OPTIONS request
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    // Forward response body
    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    console.error("gRPC proxy error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}


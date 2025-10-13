#!/usr/bin/env python3
"""
WebSocket Server for Real-time Import Status Updates

This module provides a WebSocket server for real-time updates
of import status changes.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Set, Dict, Any
import websockets
from websockets.server import WebSocketServerProtocol
import yaml
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from packages.spirit_in_physics_pipeline.import_status_manager import ImportStatusManager, ImportStatus

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ImportStatusWebSocketServer:
    """WebSocket server for real-time import status updates."""
    
    def __init__(self, config: Dict[str, Any], port: int = 8002):
        self.config = config
        self.port = port
        self.status_manager = ImportStatusManager(config['arangodb'])
        self.clients: Set[WebSocketServerProtocol] = set()
        self.last_status_hash = None
        
    async def register_client(self, websocket: WebSocketServerProtocol):
        """Register a new WebSocket client."""
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        
        # Send current status to new client
        try:
            current_status = await self.get_current_status()
            await websocket.send(json.dumps({
                "type": "initial_status",
                "data": current_status,
                "timestamp": datetime.now().isoformat()
            }))
        except Exception as e:
            logger.error(f"Error sending initial status to client: {e}")
    
    async def unregister_client(self, websocket: WebSocketServerProtocol):
        """Unregister a WebSocket client."""
        self.clients.discard(websocket)
        logger.info(f"Client disconnected. Total clients: {len(self.clients)}")
    
    async def get_current_status(self) -> Dict[str, Any]:
        """Get current import status summary."""
        try:
            summary = self.status_manager.get_import_summary()
            statuses = self.status_manager.get_all_import_statuses()
            
            return {
                "summary": summary,
                "statuses": [
                    {
                        "participant_id": s.participant_id,
                        "status": s.status.value,
                        "import_type": s.import_type.value,
                        "imported_at": s.imported_at,
                        "last_updated": s.last_updated,
                        "data_sources": s.data_sources,
                        "records_count": s.records_count,
                        "error_message": s.error_message,
                        "metadata": s.metadata
                    }
                    for s in statuses
                ]
            }
        except Exception as e:
            logger.error(f"Error getting current status: {e}")
            return {"error": str(e)}
    
    async def check_status_changes(self):
        """Check for status changes and broadcast to clients."""
        try:
            current_status = await self.get_current_status()
            current_hash = hash(json.dumps(current_status, sort_keys=True))
            
            if current_hash != self.last_status_hash:
                self.last_status_hash = current_hash
                
                if self.clients:
                    message = json.dumps({
                        "type": "status_update",
                        "data": current_status,
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    # Broadcast to all connected clients
                    disconnected_clients = set()
                    for client in self.clients:
                        try:
                            await client.send(message)
                        except websockets.exceptions.ConnectionClosed:
                            disconnected_clients.add(client)
                        except Exception as e:
                            logger.error(f"Error sending message to client: {e}")
                            disconnected_clients.add(client)
                    
                    # Remove disconnected clients
                    for client in disconnected_clients:
                        await self.unregister_client(client)
                    
                    logger.info(f"Broadcasted status update to {len(self.clients)} clients")
                    
        except Exception as e:
            logger.error(f"Error checking status changes: {e}")
    
    async def handle_client_message(self, websocket: WebSocketServerProtocol, message: str):
        """Handle incoming message from client."""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            
            if message_type == "ping":
                await websocket.send(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }))
            elif message_type == "get_status":
                current_status = await self.get_current_status()
                await websocket.send(json.dumps({
                    "type": "status_response",
                    "data": current_status,
                    "timestamp": datetime.now().isoformat()
                }))
            elif message_type == "subscribe_participant":
                participant_id = data.get("participant_id")
                if participant_id:
                    # Store participant subscription (simplified implementation)
                    await websocket.send(json.dumps({
                        "type": "subscription_confirmed",
                        "participant_id": participant_id,
                        "timestamp": datetime.now().isoformat()
                    }))
            else:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}",
                    "timestamp": datetime.now().isoformat()
                }))
                
        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Invalid JSON message",
                "timestamp": datetime.now().isoformat()
            }))
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
            await websocket.send(json.dumps({
                "type": "error",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }))
    
    async def handle_client(self, websocket: WebSocketServerProtocol, path: str):
        """Handle WebSocket client connection."""
        await self.register_client(websocket)
        
        try:
            async for message in websocket:
                await self.handle_client_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            logger.error(f"Error handling client: {e}")
        finally:
            await self.unregister_client(websocket)
    
    async def status_monitor(self):
        """Monitor status changes and broadcast updates."""
        while True:
            try:
                await self.check_status_changes()
                await asyncio.sleep(5)  # Check every 5 seconds
            except Exception as e:
                logger.error(f"Error in status monitor: {e}")
                await asyncio.sleep(10)  # Wait longer on error
    
    async def start_server(self):
        """Start the WebSocket server."""
        logger.info(f"Starting WebSocket server on port {self.port}")
        
        # Start status monitoring task
        monitor_task = asyncio.create_task(self.status_monitor())
        
        # Start WebSocket server
        async with websockets.serve(
            self.handle_client,
            "0.0.0.0",
            self.port,
            ping_interval=30,
            ping_timeout=10
        ):
            logger.info(f"WebSocket server started on ws://0.0.0.0:{self.port}")
            await asyncio.Future()  # Run forever

def load_config():
    """Load configuration from config.yaml."""
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

async def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Import Status WebSocket Server")
    parser.add_argument('--port', type=int, default=8002, help='Port to run the WebSocket server on.')
    parser.add_argument('--config', type=str, default='config.yaml', help='Path to the configuration file.')
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config()
    
    # Create and start server
    server = ImportStatusWebSocketServer(config, args.port)
    await server.start_server()

if __name__ == "__main__":
    asyncio.run(main())

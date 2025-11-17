// Merkle DAG: graphql.service.resolvers.subscription
// GraphQL Subscription resolvers

use async_graphql::*;
use crate::physics::SimulationManager;
use crate::types::*;

pub struct ForceGraphSubscription;

#[Subscription]
impl ForceGraphSubscription {
    async fn force_graph_updates(
        &self,
        ctx: &Context<'_>,
        simulation_id: String,
        max_fps: Option<i32>,
    ) -> Result<impl futures::Stream<Item = ForceGraphUpdate>> {
        let simulation_manager = ctx.data::<SimulationManager>()?;
        let max_fps = max_fps.unwrap_or(0); // 0 = unlimited

        simulation_manager
            .get_simulation_stream(&simulation_id, max_fps)
            .await
            .map_err(|e| Error::new(e))
    }
}


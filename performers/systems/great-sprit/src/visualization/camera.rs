//! 3D camera control

use bevy::prelude::*;

/// Camera controller
pub struct CameraController;

impl CameraController {
    /// Setup camera
    pub fn setup(mut commands: Commands) {
        commands.spawn(Camera3dBundle {
            transform: Transform::from_xyz(5.0, 5.0, 5.0)
                .looking_at(Vec3::ZERO, Vec3::Y),
            ..default()
        });
    }
}


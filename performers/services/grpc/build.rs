fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .build_server(true)
        .build_client(false) // We only need server code
        .protoc_arg("--experimental_allow_proto3_optional")
        .compile(
            &[
                "proto/common.proto",
                "proto/participants.proto",
                "proto/sessions.proto",
                "proto/timeline.proto",
                "proto/stimulus_words.proto",
            ],
            &["proto"],
        )?;
    Ok(())
}


// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）

import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/client";
import { gql } from "@apollo/client";

const UPLOAD_ARTIFACT_MUTATION = gql`
  mutation UploadArtifact($participantId: String!, $fileType: String!, $fileName: String!, $fileContent: String!) {
    uploadArtifact(participantId: $participantId, fileType: $fileType, fileName: $fileName, fileContent: $fileContent)
  }
`;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as Blob | null;
        const sessionId = formData.get("sessionId") as string | null;
        const fileName = formData.get("fileName") as string | null;
        const participantId = formData.get("participantId") as string | null;

        if (!file || !sessionId || !fileName || !participantId) {
            return new NextResponse("Missing required form data", { status: 400 });
        }

        const fileType = fileName.includes("video") ? "video" : "session_data";
        
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileContent = buffer.toString('base64');

        const client = getClient();
        const { data } = await client.mutate({
            mutation: UPLOAD_ARTIFACT_MUTATION,
            variables: { participantId, fileType, fileName, fileContent },
        });

        return NextResponse.json({
            success: true,
            message: "Artifact saved successfully",
            result: JSON.parse(data.uploadArtifact),
        });
    } catch (error) {
        console.error("Error saving artifact:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

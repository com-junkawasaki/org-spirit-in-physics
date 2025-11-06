// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）

import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/client";
import { gql } from "@apollo/client";
import { SaveStructuredDataPayloadSchema } from "scripts/src/00_schema";

const SAVE_STRUCTURED_DATA_MUTATION = gql`
  mutation SaveStructuredData($data: JSON!) {
    saveStructuredData(data: $data)
  }
`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validationResult = SaveStructuredDataPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            return new NextResponse(
                JSON.stringify({ error: "Invalid payload", details: validationResult.error.format() }),
                { status: 400 },
            );
        }

        const dataToSave = validationResult.data;
        const client = getClient();
        await client.mutate({
            mutation: SAVE_STRUCTURED_DATA_MUTATION,
            variables: { data: dataToSave },
        });

        return NextResponse.json({
            success: true,
            message: "Data saved successfully",
        });
    } catch (error) {
        console.error("Error saving data:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

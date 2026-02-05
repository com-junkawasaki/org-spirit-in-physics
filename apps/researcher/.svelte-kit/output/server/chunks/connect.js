import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { r as runtimeConfig } from "./env.svelte.js";
import { Message, proto3, Struct, Timestamp, MethodKind, protoInt64 } from "@bufbuild/protobuf";
class StartAssessmentRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: string email = 2;
   */
  email = "";
  /**
   * @generated from field: optional string age_group = 3;
   */
  ageGroup;
  /**
   * @generated from field: optional string gender = 4;
   */
  gender;
  /**
   * @generated from field: optional string ethnicity = 5;
   */
  ethnicity;
  /**
   * @generated from field: optional string income_range = 6;
   */
  incomeRange;
  /**
   * @generated from field: repeated string medical_history = 7;
   */
  medicalHistory = [];
  /**
   * quick, full, professional
   *
   * @generated from field: optional string mode = 8;
   */
  mode;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.StartAssessmentRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "email",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 3, name: "age_group", kind: "scalar", T: 9, opt: true },
    { no: 4, name: "gender", kind: "scalar", T: 9, opt: true },
    { no: 5, name: "ethnicity", kind: "scalar", T: 9, opt: true },
    { no: 6, name: "income_range", kind: "scalar", T: 9, opt: true },
    { no: 7, name: "medical_history", kind: "scalar", T: 9, repeated: true },
    { no: 8, name: "mode", kind: "scalar", T: 9, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new StartAssessmentRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new StartAssessmentRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new StartAssessmentRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(StartAssessmentRequest, a, b);
  }
}
class StartAssessmentResponse extends Message {
  /**
   * @generated from field: string workflow_id = 1;
   */
  workflowId = "";
  /**
   * @generated from field: string run_id = 2;
   */
  runId = "";
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.StartAssessmentResponse";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "workflow_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "run_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    }
  ]);
  static fromBinary(bytes, options) {
    return new StartAssessmentResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new StartAssessmentResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new StartAssessmentResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(StartAssessmentResponse, a, b);
  }
}
class SignalWordResponseRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: int32 stimulus_word_id = 2;
   */
  stimulusWordId = 0;
  /**
   * @generated from field: string response_word = 3;
   */
  responseWord = "";
  /**
   * @generated from field: int32 reaction_time_ms = 4;
   */
  reactionTimeMs = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.SignalWordResponseRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "stimulus_word_id",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    },
    {
      no: 3,
      name: "response_word",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 4,
      name: "reaction_time_ms",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    }
  ]);
  static fromBinary(bytes, options) {
    return new SignalWordResponseRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new SignalWordResponseRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new SignalWordResponseRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(SignalWordResponseRequest, a, b);
  }
}
class SignalWordResponseResponse extends Message {
  /**
   * @generated from field: bool success = 1;
   */
  success = false;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.SignalWordResponseResponse";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "success",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    }
  ]);
  static fromBinary(bytes, options) {
    return new SignalWordResponseResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new SignalWordResponseResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new SignalWordResponseResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(SignalWordResponseResponse, a, b);
  }
}
class SignalStartSessionRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: int32 session_number = 2;
   */
  sessionNumber = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.SignalStartSessionRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "session_number",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    }
  ]);
  static fromBinary(bytes, options) {
    return new SignalStartSessionRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new SignalStartSessionRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new SignalStartSessionRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(SignalStartSessionRequest, a, b);
  }
}
class SignalStartSessionResponse extends Message {
  /**
   * @generated from field: bool success = 1;
   */
  success = false;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.SignalStartSessionResponse";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "success",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    }
  ]);
  static fromBinary(bytes, options) {
    return new SignalStartSessionResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new SignalStartSessionResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new SignalStartSessionResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(SignalStartSessionResponse, a, b);
  }
}
class SignalArtifactRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * video, image, audio
   *
   * @generated from field: string artifact_type = 2;
   */
  artifactType = "";
  /**
   * @generated from field: string url = 3;
   */
  url = "";
  /**
   * @generated from field: int32 session = 4;
   */
  session = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.SignalArtifactRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "artifact_type",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 3,
      name: "url",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 4,
      name: "session",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    }
  ]);
  static fromBinary(bytes, options) {
    return new SignalArtifactRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new SignalArtifactRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new SignalArtifactRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(SignalArtifactRequest, a, b);
  }
}
class SignalArtifactResponse extends Message {
  /**
   * @generated from field: bool success = 1;
   */
  success = false;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.SignalArtifactResponse";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "success",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    }
  ]);
  static fromBinary(bytes, options) {
    return new SignalArtifactResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new SignalArtifactResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new SignalArtifactResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(SignalArtifactResponse, a, b);
  }
}
class CompleteAssessmentRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.CompleteAssessmentRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    }
  ]);
  static fromBinary(bytes, options) {
    return new CompleteAssessmentRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new CompleteAssessmentRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new CompleteAssessmentRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(CompleteAssessmentRequest, a, b);
  }
}
class CompleteAssessmentResponse extends Message {
  /**
   * @generated from field: bool success = 1;
   */
  success = false;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.CompleteAssessmentResponse";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "success",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    }
  ]);
  static fromBinary(bytes, options) {
    return new CompleteAssessmentResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new CompleteAssessmentResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new CompleteAssessmentResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(CompleteAssessmentResponse, a, b);
  }
}
class GetAssessmentStatusRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetAssessmentStatusRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    }
  ]);
  static fromBinary(bytes, options) {
    return new GetAssessmentStatusRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetAssessmentStatusRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetAssessmentStatusRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetAssessmentStatusRequest, a, b);
  }
}
class GetAssessmentStatusResponse extends Message {
  /**
   * @generated from field: string status = 1;
   */
  status = "";
  /**
   * @generated from field: int32 responses_count = 2;
   */
  responsesCount = 0;
  /**
   * @generated from field: int32 artifacts_count = 3;
   */
  artifactsCount = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetAssessmentStatusResponse";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "status",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "responses_count",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    },
    {
      no: 3,
      name: "artifacts_count",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    }
  ]);
  static fromBinary(bytes, options) {
    return new GetAssessmentStatusResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetAssessmentStatusResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetAssessmentStatusResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetAssessmentStatusResponse, a, b);
  }
}
class GetParticipantsRequest extends Message {
  /**
   * Optional: filter by is_public (for unauthenticated users)
   *
   * @generated from field: optional bool is_public = 1;
   */
  isPublic;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetParticipantsRequest";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "is_public", kind: "scalar", T: 8, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetParticipantsRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetParticipantsRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetParticipantsRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetParticipantsRequest, a, b);
  }
}
class GetParticipantsResponse extends Message {
  /**
   * @generated from field: repeated participant.v1.Participant participants = 1;
   */
  participants = [];
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetParticipantsResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "participants", kind: "message", T: Participant, repeated: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetParticipantsResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetParticipantsResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetParticipantsResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetParticipantsResponse, a, b);
  }
}
class GetParticipantRequest extends Message {
  /**
   * @generated from field: string id = 1;
   */
  id = "";
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetParticipantRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    }
  ]);
  static fromBinary(bytes, options) {
    return new GetParticipantRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetParticipantRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetParticipantRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetParticipantRequest, a, b);
  }
}
class GetParticipantResponse extends Message {
  /**
   * @generated from field: participant.v1.Participant participant = 1;
   */
  participant;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetParticipantResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "participant", kind: "message", T: Participant }
  ]);
  static fromBinary(bytes, options) {
    return new GetParticipantResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetParticipantResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetParticipantResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetParticipantResponse, a, b);
  }
}
class GetParticipantByEmailRequest extends Message {
  /**
   * @generated from field: string email = 1;
   */
  email = "";
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetParticipantByEmailRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "email",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    }
  ]);
  static fromBinary(bytes, options) {
    return new GetParticipantByEmailRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetParticipantByEmailRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetParticipantByEmailRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetParticipantByEmailRequest, a, b);
  }
}
class GetParticipantByEmailResponse extends Message {
  /**
   * @generated from field: participant.v1.Participant participant = 1;
   */
  participant;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetParticipantByEmailResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "participant", kind: "message", T: Participant }
  ]);
  static fromBinary(bytes, options) {
    return new GetParticipantByEmailResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetParticipantByEmailResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetParticipantByEmailResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetParticipantByEmailResponse, a, b);
  }
}
class CreateParticipantRequest extends Message {
  /**
   * @generated from field: optional string id = 1;
   */
  id;
  /**
   * @generated from field: string email = 2;
   */
  email = "";
  /**
   * @generated from field: google.protobuf.Struct agreements = 3;
   */
  agreements;
  /**
   * @generated from field: google.protobuf.Timestamp agreed_at = 4;
   */
  agreedAt;
  /**
   * @generated from field: optional bool is_public = 5;
   */
  isPublic;
  /**
   * @generated from field: optional string age_group = 6;
   */
  ageGroup;
  /**
   * @generated from field: optional string ethnicity = 7;
   */
  ethnicity;
  /**
   * @generated from field: optional string income_range = 8;
   */
  incomeRange;
  /**
   * @generated from field: repeated string medical_history = 9;
   */
  medicalHistory = [];
  /**
   * @generated from field: optional string gender = 10;
   */
  gender;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.CreateParticipantRequest";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "id", kind: "scalar", T: 9, opt: true },
    {
      no: 2,
      name: "email",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 3, name: "agreements", kind: "message", T: Struct },
    { no: 4, name: "agreed_at", kind: "message", T: Timestamp },
    { no: 5, name: "is_public", kind: "scalar", T: 8, opt: true },
    { no: 6, name: "age_group", kind: "scalar", T: 9, opt: true },
    { no: 7, name: "ethnicity", kind: "scalar", T: 9, opt: true },
    { no: 8, name: "income_range", kind: "scalar", T: 9, opt: true },
    { no: 9, name: "medical_history", kind: "scalar", T: 9, repeated: true },
    { no: 10, name: "gender", kind: "scalar", T: 9, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new CreateParticipantRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new CreateParticipantRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new CreateParticipantRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(CreateParticipantRequest, a, b);
  }
}
class CreateParticipantResponse extends Message {
  /**
   * @generated from field: participant.v1.Participant participant = 1;
   */
  participant;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.CreateParticipantResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "participant", kind: "message", T: Participant }
  ]);
  static fromBinary(bytes, options) {
    return new CreateParticipantResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new CreateParticipantResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new CreateParticipantResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(CreateParticipantResponse, a, b);
  }
}
class GetStimulusWordsRequest extends Message {
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetStimulusWordsRequest";
  static fields = proto3.util.newFieldList(() => []);
  static fromBinary(bytes, options) {
    return new GetStimulusWordsRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetStimulusWordsRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetStimulusWordsRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetStimulusWordsRequest, a, b);
  }
}
class GetStimulusWordsResponse extends Message {
  /**
   * @generated from field: repeated participant.v1.StimulusWord words = 1;
   */
  words = [];
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetStimulusWordsResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "words", kind: "message", T: StimulusWord, repeated: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetStimulusWordsResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetStimulusWordsResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetStimulusWordsResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetStimulusWordsResponse, a, b);
  }
}
class GetStimulusWordRequest extends Message {
  /**
   * @generated from field: int32 id = 1;
   */
  id = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetStimulusWordRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "id",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    }
  ]);
  static fromBinary(bytes, options) {
    return new GetStimulusWordRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetStimulusWordRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetStimulusWordRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetStimulusWordRequest, a, b);
  }
}
class GetStimulusWordResponse extends Message {
  /**
   * @generated from field: participant.v1.StimulusWord word = 1;
   */
  word;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.GetStimulusWordResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "word", kind: "message", T: StimulusWord }
  ]);
  static fromBinary(bytes, options) {
    return new GetStimulusWordResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetStimulusWordResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetStimulusWordResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetStimulusWordResponse, a, b);
  }
}
class Participant extends Message {
  /**
   * @generated from field: string id = 1;
   */
  id = "";
  /**
   * @generated from field: optional int32 age = 2;
   */
  age;
  /**
   * @generated from field: optional string gender = 3;
   */
  gender;
  /**
   * @generated from field: optional string handedness = 4;
   */
  handedness;
  /**
   * @generated from field: optional string email = 12;
   */
  email;
  /**
   * @generated from field: optional string age_group = 8;
   */
  ageGroup;
  /**
   * @generated from field: optional string ethnicity = 9;
   */
  ethnicity;
  /**
   * @generated from field: optional string income_range = 10;
   */
  incomeRange;
  /**
   * @generated from field: repeated string medical_history = 11;
   */
  medicalHistory = [];
  /**
   * @generated from field: bool is_public = 5;
   */
  isPublic = false;
  /**
   * @generated from field: google.protobuf.Timestamp created_at = 6;
   */
  createdAt;
  /**
   * @generated from field: google.protobuf.Timestamp updated_at = 7;
   */
  updatedAt;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.Participant";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "age", kind: "scalar", T: 5, opt: true },
    { no: 3, name: "gender", kind: "scalar", T: 9, opt: true },
    { no: 4, name: "handedness", kind: "scalar", T: 9, opt: true },
    { no: 12, name: "email", kind: "scalar", T: 9, opt: true },
    { no: 8, name: "age_group", kind: "scalar", T: 9, opt: true },
    { no: 9, name: "ethnicity", kind: "scalar", T: 9, opt: true },
    { no: 10, name: "income_range", kind: "scalar", T: 9, opt: true },
    { no: 11, name: "medical_history", kind: "scalar", T: 9, repeated: true },
    {
      no: 5,
      name: "is_public",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    },
    { no: 6, name: "created_at", kind: "message", T: Timestamp },
    { no: 7, name: "updated_at", kind: "message", T: Timestamp }
  ]);
  static fromBinary(bytes, options) {
    return new Participant().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new Participant().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new Participant().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(Participant, a, b);
  }
}
class StimulusWord extends Message {
  /**
   * @generated from field: int32 id = 1;
   */
  id = 0;
  /**
   * @generated from field: string japanese = 2;
   */
  japanese = "";
  /**
   * @generated from field: string english = 3;
   */
  english = "";
  /**
   * @generated from field: string french = 5;
   */
  french = "";
  /**
   * @generated from field: string spanish = 6;
   */
  spanish = "";
  /**
   * @generated from field: string russian = 7;
   */
  russian = "";
  /**
   * @generated from field: string arabic = 8;
   */
  arabic = "";
  /**
   * @generated from field: string chinese = 9;
   */
  chinese = "";
  /**
   * @generated from field: string pronunciation = 4;
   */
  pronunciation = "";
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "participant.v1.StimulusWord";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "id",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    },
    {
      no: 2,
      name: "japanese",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 3,
      name: "english",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 5,
      name: "french",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 6,
      name: "spanish",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 7,
      name: "russian",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 8,
      name: "arabic",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 9,
      name: "chinese",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 4,
      name: "pronunciation",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    }
  ]);
  static fromBinary(bytes, options) {
    return new StimulusWord().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new StimulusWord().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new StimulusWord().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(StimulusWord, a, b);
  }
}
const ParticipantService = {
  typeName: "participant.v1.ParticipantService",
  methods: {
    /**
     * Get all participants
     *
     * @generated from rpc participant.v1.ParticipantService.GetParticipants
     */
    getParticipants: {
      name: "GetParticipants",
      I: GetParticipantsRequest,
      O: GetParticipantsResponse,
      kind: MethodKind.Unary
    },
    /**
     * Get a participant by ID
     *
     * @generated from rpc participant.v1.ParticipantService.GetParticipant
     */
    getParticipant: {
      name: "GetParticipant",
      I: GetParticipantRequest,
      O: GetParticipantResponse,
      kind: MethodKind.Unary
    },
    /**
     * Create a new participant
     *
     * @generated from rpc participant.v1.ParticipantService.CreateParticipant
     */
    createParticipant: {
      name: "CreateParticipant",
      I: CreateParticipantRequest,
      O: CreateParticipantResponse,
      kind: MethodKind.Unary
    },
    /**
     * Get a participant by email
     *
     * @generated from rpc participant.v1.ParticipantService.GetParticipantByEmail
     */
    getParticipantByEmail: {
      name: "GetParticipantByEmail",
      I: GetParticipantByEmailRequest,
      O: GetParticipantByEmailResponse,
      kind: MethodKind.Unary
    },
    /**
     * Get all stimulus words
     *
     * @generated from rpc participant.v1.ParticipantService.GetStimulusWords
     */
    getStimulusWords: {
      name: "GetStimulusWords",
      I: GetStimulusWordsRequest,
      O: GetStimulusWordsResponse,
      kind: MethodKind.Unary
    },
    /**
     * Get a stimulus word by ID
     *
     * @generated from rpc participant.v1.ParticipantService.GetStimulusWord
     */
    getStimulusWord: {
      name: "GetStimulusWord",
      I: GetStimulusWordRequest,
      O: GetStimulusWordResponse,
      kind: MethodKind.Unary
    },
    /**
     * Start or resume an assessment workflow
     *
     * @generated from rpc participant.v1.ParticipantService.StartAssessment
     */
    startAssessment: {
      name: "StartAssessment",
      I: StartAssessmentRequest,
      O: StartAssessmentResponse,
      kind: MethodKind.Unary
    },
    /**
     * Signal a word response to the workflow
     *
     * @generated from rpc participant.v1.ParticipantService.SignalWordResponse
     */
    signalWordResponse: {
      name: "SignalWordResponse",
      I: SignalWordResponseRequest,
      O: SignalWordResponseResponse,
      kind: MethodKind.Unary
    },
    /**
     * Signal start of a session
     *
     * @generated from rpc participant.v1.ParticipantService.SignalStartSession
     */
    signalStartSession: {
      name: "SignalStartSession",
      I: SignalStartSessionRequest,
      O: SignalStartSessionResponse,
      kind: MethodKind.Unary
    },
    /**
     * Signal an artifact (video/image) upload
     *
     * @generated from rpc participant.v1.ParticipantService.SignalArtifact
     */
    signalArtifact: {
      name: "SignalArtifact",
      I: SignalArtifactRequest,
      O: SignalArtifactResponse,
      kind: MethodKind.Unary
    },
    /**
     * Signal completion of the assessment
     *
     * @generated from rpc participant.v1.ParticipantService.CompleteAssessment
     */
    completeAssessment: {
      name: "CompleteAssessment",
      I: CompleteAssessmentRequest,
      O: CompleteAssessmentResponse,
      kind: MethodKind.Unary
    },
    /**
     * Get current status of the assessment workflow
     *
     * @generated from rpc participant.v1.ParticipantService.GetAssessmentStatus
     */
    getAssessmentStatus: {
      name: "GetAssessmentStatus",
      I: GetAssessmentStatusRequest,
      O: GetAssessmentStatusResponse,
      kind: MethodKind.Unary
    }
  }
};
class GetSessionsRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "session.v1.GetSessionsRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    }
  ]);
  static fromBinary(bytes, options) {
    return new GetSessionsRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetSessionsRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetSessionsRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetSessionsRequest, a, b);
  }
}
class GetSessionsResponse extends Message {
  /**
   * @generated from field: repeated session.v1.Session sessions = 1;
   */
  sessions = [];
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "session.v1.GetSessionsResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "sessions", kind: "message", T: Session, repeated: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetSessionsResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetSessionsResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetSessionsResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetSessionsResponse, a, b);
  }
}
class CreateSessionRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: optional int32 session_index = 2;
   */
  sessionIndex;
  /**
   * @generated from field: int64 start_ts = 3;
   */
  startTs = protoInt64.zero;
  /**
   * @generated from field: google.protobuf.Struct events = 4;
   */
  events;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "session.v1.CreateSessionRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "session_index", kind: "scalar", T: 5, opt: true },
    {
      no: 3,
      name: "start_ts",
      kind: "scalar",
      T: 3
      /* ScalarType.INT64 */
    },
    { no: 4, name: "events", kind: "message", T: Struct }
  ]);
  static fromBinary(bytes, options) {
    return new CreateSessionRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new CreateSessionRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new CreateSessionRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(CreateSessionRequest, a, b);
  }
}
class CreateSessionResponse extends Message {
  /**
   * @generated from field: session.v1.Session session = 1;
   */
  session;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "session.v1.CreateSessionResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "session", kind: "message", T: Session }
  ]);
  static fromBinary(bytes, options) {
    return new CreateSessionResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new CreateSessionResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new CreateSessionResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(CreateSessionResponse, a, b);
  }
}
class Session extends Message {
  /**
   * @generated from field: string id = 1;
   */
  id = "";
  /**
   * @generated from field: string participant_id = 2;
   */
  participantId = "";
  /**
   * @generated from field: optional int32 session_index = 3;
   */
  sessionIndex;
  /**
   * @generated from field: int64 start_ts = 4;
   */
  startTs = protoInt64.zero;
  /**
   * @generated from field: optional int64 end_ts = 5;
   */
  endTs;
  /**
   * @generated from field: repeated google.protobuf.Struct events = 6;
   */
  events = [];
  /**
   * @generated from field: google.protobuf.Timestamp created_at = 7;
   */
  createdAt;
  /**
   * @generated from field: google.protobuf.Timestamp updated_at = 8;
   */
  updatedAt;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "session.v1.Session";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 3, name: "session_index", kind: "scalar", T: 5, opt: true },
    {
      no: 4,
      name: "start_ts",
      kind: "scalar",
      T: 3
      /* ScalarType.INT64 */
    },
    { no: 5, name: "end_ts", kind: "scalar", T: 3, opt: true },
    { no: 6, name: "events", kind: "message", T: Struct, repeated: true },
    { no: 7, name: "created_at", kind: "message", T: Timestamp },
    { no: 8, name: "updated_at", kind: "message", T: Timestamp }
  ]);
  static fromBinary(bytes, options) {
    return new Session().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new Session().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new Session().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(Session, a, b);
  }
}
const SessionService = {
  typeName: "session.v1.SessionService",
  methods: {
    /**
     * Get sessions for a participant
     *
     * @generated from rpc session.v1.SessionService.GetSessions
     */
    getSessions: {
      name: "GetSessions",
      I: GetSessionsRequest,
      O: GetSessionsResponse,
      kind: MethodKind.Unary
    },
    /**
     * Create a new session
     *
     * @generated from rpc session.v1.SessionService.CreateSession
     */
    createSession: {
      name: "CreateSession",
      I: CreateSessionRequest,
      O: CreateSessionResponse,
      kind: MethodKind.Unary
    }
  }
};
class GetIntegratedTimelineRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: optional string session_id = 2;
   */
  sessionId;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetIntegratedTimelineRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "session_id", kind: "scalar", T: 9, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetIntegratedTimelineRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetIntegratedTimelineRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetIntegratedTimelineRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetIntegratedTimelineRequest, a, b);
  }
}
class GetIntegratedTimelineResponse extends Message {
  /**
   * @generated from field: repeated timeline.v1.TimelinePoint points = 1;
   */
  points = [];
  /**
   * @generated from field: timeline.v1.GetAnalysisResponse analysis = 2;
   */
  analysis;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetIntegratedTimelineResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "points", kind: "message", T: TimelinePoint, repeated: true },
    { no: 2, name: "analysis", kind: "message", T: GetAnalysisResponse }
  ]);
  static fromBinary(bytes, options) {
    return new GetIntegratedTimelineResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetIntegratedTimelineResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetIntegratedTimelineResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetIntegratedTimelineResponse, a, b);
  }
}
class GetAnalysisRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: optional string session_id = 2;
   */
  sessionId;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetAnalysisRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "session_id", kind: "scalar", T: 9, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetAnalysisRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetAnalysisRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetAnalysisRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetAnalysisRequest, a, b);
  }
}
class GetAnalysisResponse extends Message {
  /**
   * @generated from field: repeated timeline.v1.GapArea gap_areas = 1;
   */
  gapAreas = [];
  /**
   * @generated from field: repeated timeline.v1.DensityRegion density_regions = 2;
   */
  densityRegions = [];
  /**
   * @generated from field: repeated timeline.v1.DuplicateCandidate duplicates = 3;
   */
  duplicates = [];
  /**
   * @generated from field: repeated timeline.v1.GhostPattern ghost_patterns = 4;
   */
  ghostPatterns = [];
  /**
   * @generated from field: double overall_density = 5;
   */
  overallDensity = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetAnalysisResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "gap_areas", kind: "message", T: GapArea, repeated: true },
    { no: 2, name: "density_regions", kind: "message", T: DensityRegion, repeated: true },
    { no: 3, name: "duplicates", kind: "message", T: DuplicateCandidate, repeated: true },
    { no: 4, name: "ghost_patterns", kind: "message", T: GhostPattern, repeated: true },
    {
      no: 5,
      name: "overall_density",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    }
  ]);
  static fromBinary(bytes, options) {
    return new GetAnalysisResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetAnalysisResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetAnalysisResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetAnalysisResponse, a, b);
  }
}
class GhostPattern extends Message {
  /**
   * @generated from field: string id = 1;
   */
  id = "";
  /**
   * [x, y, z]
   *
   * @generated from field: repeated double center = 2;
   */
  center = [];
  /**
   * @generated from field: double radius = 3;
   */
  radius = 0;
  /**
   * @generated from field: repeated string node_ids = 4;
   */
  nodeIds = [];
  /**
   * @generated from field: repeated string labels = 5;
   */
  labels = [];
  /**
   * @generated from field: double intensity = 6;
   */
  intensity = 0;
  /**
   * @generated from field: string pattern_type = 7;
   */
  patternType = "";
  /**
   * @generated from field: repeated string indicators = 8;
   */
  indicators = [];
  /**
   * @generated from field: repeated string primary_emotions = 9;
   */
  primaryEmotions = [];
  /**
   * @generated from field: string description = 10;
   */
  description = "";
  /**
   * @generated from field: double confidence = 11;
   */
  confidence = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GhostPattern";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "center", kind: "scalar", T: 1, repeated: true },
    {
      no: 3,
      name: "radius",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    },
    { no: 4, name: "node_ids", kind: "scalar", T: 9, repeated: true },
    { no: 5, name: "labels", kind: "scalar", T: 9, repeated: true },
    {
      no: 6,
      name: "intensity",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    },
    {
      no: 7,
      name: "pattern_type",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 8, name: "indicators", kind: "scalar", T: 9, repeated: true },
    { no: 9, name: "primary_emotions", kind: "scalar", T: 9, repeated: true },
    {
      no: 10,
      name: "description",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 11,
      name: "confidence",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    }
  ]);
  static fromBinary(bytes, options) {
    return new GhostPattern().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GhostPattern().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GhostPattern().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GhostPattern, a, b);
  }
}
class GapArea extends Message {
  /**
   * @generated from field: string id = 1;
   */
  id = "";
  /**
   * [x, y, z]
   *
   * @generated from field: repeated double center = 2;
   */
  center = [];
  /**
   * @generated from field: double radius = 3;
   */
  radius = 0;
  /**
   * @generated from field: repeated timeline.v1.NearbyNode nearby_nodes = 4;
   */
  nearbyNodes = [];
  /**
   * @generated from field: repeated string suggested_items = 5;
   */
  suggestedItems = [];
  /**
   * @generated from field: double confidence = 6;
   */
  confidence = 0;
  /**
   * @generated from field: google.protobuf.Struct common_emotion_profile = 7;
   */
  commonEmotionProfile;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GapArea";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "center", kind: "scalar", T: 1, repeated: true },
    {
      no: 3,
      name: "radius",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    },
    { no: 4, name: "nearby_nodes", kind: "message", T: NearbyNode, repeated: true },
    { no: 5, name: "suggested_items", kind: "scalar", T: 9, repeated: true },
    {
      no: 6,
      name: "confidence",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    },
    { no: 7, name: "common_emotion_profile", kind: "message", T: Struct }
  ]);
  static fromBinary(bytes, options) {
    return new GapArea().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GapArea().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GapArea().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GapArea, a, b);
  }
}
class NearbyNode extends Message {
  /**
   * @generated from field: string node_id = 1;
   */
  nodeId = "";
  /**
   * @generated from field: string label = 2;
   */
  label = "";
  /**
   * @generated from field: double distance = 3;
   */
  distance = 0;
  /**
   * @generated from field: repeated string common_features = 4;
   */
  commonFeatures = [];
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.NearbyNode";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "node_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "label",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 3,
      name: "distance",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    },
    { no: 4, name: "common_features", kind: "scalar", T: 9, repeated: true }
  ]);
  static fromBinary(bytes, options) {
    return new NearbyNode().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new NearbyNode().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new NearbyNode().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(NearbyNode, a, b);
  }
}
class DensityRegion extends Message {
  /**
   * @generated from field: string id = 1;
   */
  id = "";
  /**
   * @generated from field: repeated double center = 2;
   */
  center = [];
  /**
   * @generated from field: double radius = 3;
   */
  radius = 0;
  /**
   * @generated from field: int32 node_count = 4;
   */
  nodeCount = 0;
  /**
   * @generated from field: double density = 5;
   */
  density = 0;
  /**
   * @generated from field: bool is_overcrowded = 6;
   */
  isOvercrowded = false;
  /**
   * @generated from field: optional double suggested_separation = 7;
   */
  suggestedSeparation;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.DensityRegion";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "center", kind: "scalar", T: 1, repeated: true },
    {
      no: 3,
      name: "radius",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    },
    {
      no: 4,
      name: "node_count",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    },
    {
      no: 5,
      name: "density",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    },
    {
      no: 6,
      name: "is_overcrowded",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    },
    { no: 7, name: "suggested_separation", kind: "scalar", T: 1, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new DensityRegion().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new DensityRegion().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new DensityRegion().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(DensityRegion, a, b);
  }
}
class DuplicateCandidate extends Message {
  /**
   * @generated from field: string id = 1;
   */
  id = "";
  /**
   * @generated from field: repeated string node_ids = 2;
   */
  nodeIds = [];
  /**
   * @generated from field: repeated string labels = 3;
   */
  labels = [];
  /**
   * @generated from field: double similarity = 4;
   */
  similarity = 0;
  /**
   * @generated from field: timeline.v1.CommonFeatures common_features = 5;
   */
  commonFeatures;
  /**
   * @generated from field: bool suggested_merge = 6;
   */
  suggestedMerge = false;
  /**
   * @generated from field: double distance = 7;
   */
  distance = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.DuplicateCandidate";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "node_ids", kind: "scalar", T: 9, repeated: true },
    { no: 3, name: "labels", kind: "scalar", T: 9, repeated: true },
    {
      no: 4,
      name: "similarity",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    },
    { no: 5, name: "common_features", kind: "message", T: CommonFeatures },
    {
      no: 6,
      name: "suggested_merge",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    },
    {
      no: 7,
      name: "distance",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    }
  ]);
  static fromBinary(bytes, options) {
    return new DuplicateCandidate().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new DuplicateCandidate().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new DuplicateCandidate().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(DuplicateCandidate, a, b);
  }
}
class CommonFeatures extends Message {
  /**
   * @generated from field: google.protobuf.Struct emotion_profile = 1;
   */
  emotionProfile;
  /**
   * @generated from field: repeated string semantic_tags = 2;
   */
  semanticTags = [];
  /**
   * @generated from field: repeated double frequency_range = 3;
   */
  frequencyRange = [];
  /**
   * @generated from field: repeated double reaction_time_range = 4;
   */
  reactionTimeRange = [];
  /**
   * @generated from field: repeated double reaction_value_range = 5;
   */
  reactionValueRange = [];
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.CommonFeatures";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "emotion_profile", kind: "message", T: Struct },
    { no: 2, name: "semantic_tags", kind: "scalar", T: 9, repeated: true },
    { no: 3, name: "frequency_range", kind: "scalar", T: 1, repeated: true },
    { no: 4, name: "reaction_time_range", kind: "scalar", T: 1, repeated: true },
    { no: 5, name: "reaction_value_range", kind: "scalar", T: 1, repeated: true }
  ]);
  static fromBinary(bytes, options) {
    return new CommonFeatures().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new CommonFeatures().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new CommonFeatures().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(CommonFeatures, a, b);
  }
}
class GetTimelineRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: optional string session_id = 2;
   */
  sessionId;
  /**
   * @generated from field: optional google.protobuf.Timestamp start_time = 3;
   */
  startTime;
  /**
   * @generated from field: optional google.protobuf.Timestamp end_time = 4;
   */
  endTime;
  /**
   * e.g., "1 hour", "1 day"
   *
   * @generated from field: optional string interval = 5;
   */
  interval;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetTimelineRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "session_id", kind: "scalar", T: 9, opt: true },
    { no: 3, name: "start_time", kind: "message", T: Timestamp, opt: true },
    { no: 4, name: "end_time", kind: "message", T: Timestamp, opt: true },
    { no: 5, name: "interval", kind: "scalar", T: 9, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetTimelineRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetTimelineRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetTimelineRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetTimelineRequest, a, b);
  }
}
class GetTimelineResponse extends Message {
  /**
   * @generated from field: repeated timeline.v1.TimelinePoint points = 1;
   */
  points = [];
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetTimelineResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "points", kind: "message", T: TimelinePoint, repeated: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetTimelineResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetTimelineResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetTimelineResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetTimelineResponse, a, b);
  }
}
class GetWordAggregatesRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: optional string session_id = 2;
   */
  sessionId;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetWordAggregatesRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "session_id", kind: "scalar", T: 9, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetWordAggregatesRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetWordAggregatesRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetWordAggregatesRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetWordAggregatesRequest, a, b);
  }
}
class GetWordAggregatesResponse extends Message {
  /**
   * @generated from field: repeated timeline.v1.WordAggregate aggregates = 1;
   */
  aggregates = [];
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetWordAggregatesResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "aggregates", kind: "message", T: WordAggregate, repeated: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetWordAggregatesResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetWordAggregatesResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetWordAggregatesResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetWordAggregatesResponse, a, b);
  }
}
class GetEmotionVectorsRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: optional string session_id = 2;
   */
  sessionId;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetEmotionVectorsRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "session_id", kind: "scalar", T: 9, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetEmotionVectorsRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetEmotionVectorsRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetEmotionVectorsRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetEmotionVectorsRequest, a, b);
  }
}
class GetEmotionVectorsResponse extends Message {
  /**
   * @generated from field: repeated timeline.v1.EmotionVector vectors = 1;
   */
  vectors = [];
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetEmotionVectorsResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "vectors", kind: "message", T: EmotionVector, repeated: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetEmotionVectorsResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetEmotionVectorsResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetEmotionVectorsResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetEmotionVectorsResponse, a, b);
  }
}
class GetWordStatisticsRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: optional string session_id = 2;
   */
  sessionId;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetWordStatisticsRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "session_id", kind: "scalar", T: 9, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetWordStatisticsRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetWordStatisticsRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetWordStatisticsRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetWordStatisticsRequest, a, b);
  }
}
class GetWordStatisticsResponse extends Message {
  /**
   * @generated from field: repeated timeline.v1.WordStatistics statistics = 1;
   */
  statistics = [];
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.GetWordStatisticsResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "statistics", kind: "message", T: WordStatistics, repeated: true }
  ]);
  static fromBinary(bytes, options) {
    return new GetWordStatisticsResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetWordStatisticsResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetWordStatisticsResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetWordStatisticsResponse, a, b);
  }
}
class TimelinePoint extends Message {
  /**
   * @generated from field: google.protobuf.Timestamp time = 1;
   */
  time;
  /**
   * @generated from field: string participant_id = 2;
   */
  participantId = "";
  /**
   * @generated from field: string session_id = 3;
   */
  sessionId = "";
  /**
   * @generated from field: optional string word = 4;
   */
  word;
  /**
   * @generated from field: optional string event_type = 5;
   */
  eventType;
  /**
   * @generated from field: optional double reaction_value = 6;
   */
  reactionValue;
  /**
   * @generated from field: optional double reaction_time = 7;
   */
  reactionTime;
  /**
   * @generated from field: bool has_response = 8;
   */
  hasResponse = false;
  /**
   * @generated from field: repeated timeline.v1.EmotionData emotions = 9;
   */
  emotions = [];
  /**
   * @generated from field: repeated timeline.v1.PhysiologicalData physiological = 10;
   */
  physiological = [];
  /**
   * @generated from field: google.protobuf.Struct metadata = 11;
   */
  metadata;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.TimelinePoint";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "time", kind: "message", T: Timestamp },
    {
      no: 2,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 3,
      name: "session_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 4, name: "word", kind: "scalar", T: 9, opt: true },
    { no: 5, name: "event_type", kind: "scalar", T: 9, opt: true },
    { no: 6, name: "reaction_value", kind: "scalar", T: 1, opt: true },
    { no: 7, name: "reaction_time", kind: "scalar", T: 1, opt: true },
    {
      no: 8,
      name: "has_response",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    },
    { no: 9, name: "emotions", kind: "message", T: EmotionData, repeated: true },
    { no: 10, name: "physiological", kind: "message", T: PhysiologicalData, repeated: true },
    { no: 11, name: "metadata", kind: "message", T: Struct }
  ]);
  static fromBinary(bytes, options) {
    return new TimelinePoint().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new TimelinePoint().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new TimelinePoint().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(TimelinePoint, a, b);
  }
}
class EmotionData extends Message {
  /**
   * @generated from field: string name = 1;
   */
  name = "";
  /**
   * @generated from field: double score = 2;
   */
  score = 0;
  /**
   * @generated from field: string file_type = 3;
   */
  fileType = "";
  /**
   * @generated from field: optional string color = 4;
   */
  color;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.EmotionData";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "name",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "score",
      kind: "scalar",
      T: 1
      /* ScalarType.DOUBLE */
    },
    {
      no: 3,
      name: "file_type",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 4, name: "color", kind: "scalar", T: 9, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new EmotionData().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new EmotionData().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new EmotionData().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(EmotionData, a, b);
  }
}
class PhysiologicalData extends Message {
  /**
   * @generated from field: optional google.protobuf.Timestamp timestamp = 1;
   */
  timestamp;
  /**
   * @generated from field: optional double value = 2;
   */
  value;
  /**
   * @generated from field: optional string measurement_type = 3;
   */
  measurementType;
  /**
   * @generated from field: optional google.protobuf.Struct metadata = 4;
   */
  metadata;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.PhysiologicalData";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "timestamp", kind: "message", T: Timestamp, opt: true },
    { no: 2, name: "value", kind: "scalar", T: 1, opt: true },
    { no: 3, name: "measurement_type", kind: "scalar", T: 9, opt: true },
    { no: 4, name: "metadata", kind: "message", T: Struct, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new PhysiologicalData().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new PhysiologicalData().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new PhysiologicalData().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(PhysiologicalData, a, b);
  }
}
class WordAggregate extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: string session_id = 2;
   */
  sessionId = "";
  /**
   * @generated from field: string word = 3;
   */
  word = "";
  /**
   * @generated from field: int64 count = 4;
   */
  count = protoInt64.zero;
  /**
   * @generated from field: optional double avg_reaction_value = 5;
   */
  avgReactionValue;
  /**
   * @generated from field: optional double sum_reaction_value = 6;
   */
  sumReactionValue;
  /**
   * @generated from field: optional double avg_reaction_time = 7;
   */
  avgReactionTime;
  /**
   * @generated from field: optional double sum_reaction_time = 8;
   */
  sumReactionTime;
  /**
   * @generated from field: optional double avg_physiological = 9;
   */
  avgPhysiological;
  /**
   * @generated from field: optional double sum_phys_abs = 10;
   */
  sumPhysAbs;
  /**
   * @generated from field: repeated double phys_series = 11;
   */
  physSeries = [];
  /**
   * @generated from field: repeated double rt_series = 12;
   */
  rtSeries = [];
  /**
   * @generated from field: repeated double rv_series = 13;
   */
  rvSeries = [];
  /**
   * @generated from field: google.protobuf.Timestamp first_time = 14;
   */
  firstTime;
  /**
   * @generated from field: google.protobuf.Timestamp last_time = 15;
   */
  lastTime;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.WordAggregate";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "session_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 3,
      name: "word",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 4,
      name: "count",
      kind: "scalar",
      T: 3
      /* ScalarType.INT64 */
    },
    { no: 5, name: "avg_reaction_value", kind: "scalar", T: 1, opt: true },
    { no: 6, name: "sum_reaction_value", kind: "scalar", T: 1, opt: true },
    { no: 7, name: "avg_reaction_time", kind: "scalar", T: 1, opt: true },
    { no: 8, name: "sum_reaction_time", kind: "scalar", T: 1, opt: true },
    { no: 9, name: "avg_physiological", kind: "scalar", T: 1, opt: true },
    { no: 10, name: "sum_phys_abs", kind: "scalar", T: 1, opt: true },
    { no: 11, name: "phys_series", kind: "scalar", T: 1, repeated: true },
    { no: 12, name: "rt_series", kind: "scalar", T: 1, repeated: true },
    { no: 13, name: "rv_series", kind: "scalar", T: 1, repeated: true },
    { no: 14, name: "first_time", kind: "message", T: Timestamp },
    { no: 15, name: "last_time", kind: "message", T: Timestamp }
  ]);
  static fromBinary(bytes, options) {
    return new WordAggregate().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new WordAggregate().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new WordAggregate().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(WordAggregate, a, b);
  }
}
class EmotionVector extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: string session_id = 2;
   */
  sessionId = "";
  /**
   * @generated from field: string word = 3;
   */
  word = "";
  /**
   * @generated from field: optional double joy_sum = 4;
   */
  joySum;
  /**
   * @generated from field: optional double sadness_sum = 5;
   */
  sadnessSum;
  /**
   * @generated from field: optional double anger_sum = 6;
   */
  angerSum;
  /**
   * @generated from field: optional double fear_sum = 7;
   */
  fearSum;
  /**
   * @generated from field: optional double surprise_sum = 8;
   */
  surpriseSum;
  /**
   * @generated from field: optional double disgust_sum = 9;
   */
  disgustSum;
  /**
   * @generated from field: optional double calm_sum = 10;
   */
  calmSum;
  /**
   * @generated from field: optional double focus_sum = 11;
   */
  focusSum;
  /**
   * @generated from field: optional double excitement_sum = 12;
   */
  excitementSum;
  /**
   * @generated from field: optional double confusion_sum = 13;
   */
  confusionSum;
  /**
   * @generated from field: int64 emotion_entry_count = 14;
   */
  emotionEntryCount = protoInt64.zero;
  /**
   * @generated from field: optional google.protobuf.Struct emotion_by_modality = 15;
   */
  emotionByModality;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.EmotionVector";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "session_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 3,
      name: "word",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 4, name: "joy_sum", kind: "scalar", T: 1, opt: true },
    { no: 5, name: "sadness_sum", kind: "scalar", T: 1, opt: true },
    { no: 6, name: "anger_sum", kind: "scalar", T: 1, opt: true },
    { no: 7, name: "fear_sum", kind: "scalar", T: 1, opt: true },
    { no: 8, name: "surprise_sum", kind: "scalar", T: 1, opt: true },
    { no: 9, name: "disgust_sum", kind: "scalar", T: 1, opt: true },
    { no: 10, name: "calm_sum", kind: "scalar", T: 1, opt: true },
    { no: 11, name: "focus_sum", kind: "scalar", T: 1, opt: true },
    { no: 12, name: "excitement_sum", kind: "scalar", T: 1, opt: true },
    { no: 13, name: "confusion_sum", kind: "scalar", T: 1, opt: true },
    {
      no: 14,
      name: "emotion_entry_count",
      kind: "scalar",
      T: 3
      /* ScalarType.INT64 */
    },
    { no: 15, name: "emotion_by_modality", kind: "message", T: Struct, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new EmotionVector().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new EmotionVector().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new EmotionVector().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(EmotionVector, a, b);
  }
}
class WordStatistics extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: string session_id = 2;
   */
  sessionId = "";
  /**
   * @generated from field: string word = 3;
   */
  word = "";
  /**
   * @generated from field: int64 count = 4;
   */
  count = protoInt64.zero;
  /**
   * @generated from field: optional double avg_reaction_time = 5;
   */
  avgReactionTime;
  /**
   * @generated from field: optional double std_reaction_time = 6;
   */
  stdReactionTime;
  /**
   * @generated from field: optional double var_reaction_time = 7;
   */
  varReactionTime;
  /**
   * @generated from field: optional double avg_reaction_value = 8;
   */
  avgReactionValue;
  /**
   * @generated from field: optional double std_reaction_value = 9;
   */
  stdReactionValue;
  /**
   * @generated from field: optional double var_reaction_value = 10;
   */
  varReactionValue;
  /**
   * @generated from field: optional double avg_physiological = 11;
   */
  avgPhysiological;
  /**
   * @generated from field: optional double std_physiological = 12;
   */
  stdPhysiological;
  /**
   * @generated from field: optional double var_physiological = 13;
   */
  varPhysiological;
  /**
   * @generated from field: optional double speed_index = 14;
   */
  speedIndex;
  /**
   * @generated from field: repeated double phys_series = 15;
   */
  physSeries = [];
  /**
   * @generated from field: repeated double rt_series = 16;
   */
  rtSeries = [];
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "timeline.v1.WordStatistics";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "session_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 3,
      name: "word",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 4,
      name: "count",
      kind: "scalar",
      T: 3
      /* ScalarType.INT64 */
    },
    { no: 5, name: "avg_reaction_time", kind: "scalar", T: 1, opt: true },
    { no: 6, name: "std_reaction_time", kind: "scalar", T: 1, opt: true },
    { no: 7, name: "var_reaction_time", kind: "scalar", T: 1, opt: true },
    { no: 8, name: "avg_reaction_value", kind: "scalar", T: 1, opt: true },
    { no: 9, name: "std_reaction_value", kind: "scalar", T: 1, opt: true },
    { no: 10, name: "var_reaction_value", kind: "scalar", T: 1, opt: true },
    { no: 11, name: "avg_physiological", kind: "scalar", T: 1, opt: true },
    { no: 12, name: "std_physiological", kind: "scalar", T: 1, opt: true },
    { no: 13, name: "var_physiological", kind: "scalar", T: 1, opt: true },
    { no: 14, name: "speed_index", kind: "scalar", T: 1, opt: true },
    { no: 15, name: "phys_series", kind: "scalar", T: 1, repeated: true },
    { no: 16, name: "rt_series", kind: "scalar", T: 1, repeated: true }
  ]);
  static fromBinary(bytes, options) {
    return new WordStatistics().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new WordStatistics().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new WordStatistics().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(WordStatistics, a, b);
  }
}
const TimelineService = {
  typeName: "timeline.v1.TimelineService",
  methods: {
    /**
     * Get timeline data for a participant
     *
     * @generated from rpc timeline.v1.TimelineService.GetTimeline
     */
    getTimeline: {
      name: "GetTimeline",
      I: GetTimelineRequest,
      O: GetTimelineResponse,
      kind: MethodKind.Unary
    },
    /**
     * Get word aggregates by session
     *
     * @generated from rpc timeline.v1.TimelineService.GetWordAggregates
     */
    getWordAggregates: {
      name: "GetWordAggregates",
      I: GetWordAggregatesRequest,
      O: GetWordAggregatesResponse,
      kind: MethodKind.Unary
    },
    /**
     * Get emotion vectors by word
     *
     * @generated from rpc timeline.v1.TimelineService.GetEmotionVectors
     */
    getEmotionVectors: {
      name: "GetEmotionVectors",
      I: GetEmotionVectorsRequest,
      O: GetEmotionVectorsResponse,
      kind: MethodKind.Unary
    },
    /**
     * Get word statistics by session
     *
     * @generated from rpc timeline.v1.TimelineService.GetWordStatistics
     */
    getWordStatistics: {
      name: "GetWordStatistics",
      I: GetWordStatisticsRequest,
      O: GetWordStatisticsResponse,
      kind: MethodKind.Unary
    },
    /**
     * Get structure analysis results (run via Temporal)
     *
     * @generated from rpc timeline.v1.TimelineService.GetAnalysis
     */
    getAnalysis: {
      name: "GetAnalysis",
      I: GetAnalysisRequest,
      O: GetAnalysisResponse,
      kind: MethodKind.Unary
    },
    /**
     * Get integrated timeline data and analysis (run via TS Temporal)
     *
     * @generated from rpc timeline.v1.TimelineService.GetIntegratedTimeline
     */
    getIntegratedTimeline: {
      name: "GetIntegratedTimeline",
      I: GetIntegratedTimelineRequest,
      O: GetIntegratedTimelineResponse,
      kind: MethodKind.Unary
    }
  }
};
class UploadArtifactRequest extends Message {
  /**
   * @generated from field: string participant_id = 1;
   */
  participantId = "";
  /**
   * @generated from field: string file_name = 2;
   */
  fileName = "";
  /**
   * @generated from field: bytes file_data = 3;
   */
  fileData = new Uint8Array(0);
  /**
   * @generated from field: string content_type = 4;
   */
  contentType = "";
  /**
   * "video", "audio", "consent", "session_data"
   *
   * @generated from field: string artifact_type = 5;
   */
  artifactType = "";
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "storage.v1.UploadArtifactRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "participant_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "file_name",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 3,
      name: "file_data",
      kind: "scalar",
      T: 12
      /* ScalarType.BYTES */
    },
    {
      no: 4,
      name: "content_type",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 5,
      name: "artifact_type",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    }
  ]);
  static fromBinary(bytes, options) {
    return new UploadArtifactRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new UploadArtifactRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new UploadArtifactRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(UploadArtifactRequest, a, b);
  }
}
class UploadArtifactResponse extends Message {
  /**
   * @generated from field: string public_url = 1;
   */
  publicUrl = "";
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "storage.v1.UploadArtifactResponse";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "public_url",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    }
  ]);
  static fromBinary(bytes, options) {
    return new UploadArtifactResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new UploadArtifactResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new UploadArtifactResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(UploadArtifactResponse, a, b);
  }
}
const StorageService = {
  typeName: "storage.v1.StorageService",
  methods: {
    /**
     * Upload an artifact (video, audio, etc.)
     *
     * @generated from rpc storage.v1.StorageService.UploadArtifact
     */
    uploadArtifact: {
      name: "UploadArtifact",
      I: UploadArtifactRequest,
      O: UploadArtifactResponse,
      kind: MethodKind.Unary
    }
  }
};
class GetPreferenceRequest extends Message {
  /**
   * @generated from field: string user_id = 1;
   */
  userId = "";
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "preference.v1.GetPreferenceRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "user_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    }
  ]);
  static fromBinary(bytes, options) {
    return new GetPreferenceRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetPreferenceRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetPreferenceRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetPreferenceRequest, a, b);
  }
}
class GetPreferenceResponse extends Message {
  /**
   * @generated from field: preference.v1.Preference preference = 1;
   */
  preference;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "preference.v1.GetPreferenceResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "preference", kind: "message", T: Preference }
  ]);
  static fromBinary(bytes, options) {
    return new GetPreferenceResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new GetPreferenceResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new GetPreferenceResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(GetPreferenceResponse, a, b);
  }
}
class UpdatePreferenceRequest extends Message {
  /**
   * @generated from field: string user_id = 1;
   */
  userId = "";
  /**
   * light, dark, system
   *
   * @generated from field: optional string theme = 2;
   */
  theme;
  /**
   * en, ja, etc.
   *
   * @generated from field: optional string language = 3;
   */
  language;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "preference.v1.UpdatePreferenceRequest";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "user_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    { no: 2, name: "theme", kind: "scalar", T: 9, opt: true },
    { no: 3, name: "language", kind: "scalar", T: 9, opt: true }
  ]);
  static fromBinary(bytes, options) {
    return new UpdatePreferenceRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new UpdatePreferenceRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new UpdatePreferenceRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(UpdatePreferenceRequest, a, b);
  }
}
class UpdatePreferenceResponse extends Message {
  /**
   * @generated from field: preference.v1.Preference preference = 1;
   */
  preference;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "preference.v1.UpdatePreferenceResponse";
  static fields = proto3.util.newFieldList(() => [
    { no: 1, name: "preference", kind: "message", T: Preference }
  ]);
  static fromBinary(bytes, options) {
    return new UpdatePreferenceResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new UpdatePreferenceResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new UpdatePreferenceResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(UpdatePreferenceResponse, a, b);
  }
}
class Preference extends Message {
  /**
   * @generated from field: string user_id = 1;
   */
  userId = "";
  /**
   * @generated from field: string theme = 2;
   */
  theme = "";
  /**
   * @generated from field: string language = 3;
   */
  language = "";
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "preference.v1.Preference";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "user_id",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 2,
      name: "theme",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    },
    {
      no: 3,
      name: "language",
      kind: "scalar",
      T: 9
      /* ScalarType.STRING */
    }
  ]);
  static fromBinary(bytes, options) {
    return new Preference().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new Preference().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new Preference().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(Preference, a, b);
  }
}
const PreferenceService = {
  typeName: "preference.v1.PreferenceService",
  methods: {
    /**
     * Get user preferences
     *
     * @generated from rpc preference.v1.PreferenceService.GetPreference
     */
    getPreference: {
      name: "GetPreference",
      I: GetPreferenceRequest,
      O: GetPreferenceResponse,
      kind: MethodKind.Unary
    },
    /**
     * Update user preferences
     *
     * @generated from rpc preference.v1.PreferenceService.UpdatePreference
     */
    updatePreference: {
      name: "UpdatePreference",
      I: UpdatePreferenceRequest,
      O: UpdatePreferenceResponse,
      kind: MethodKind.Unary
    }
  }
};
class ImportParticipantsRequest extends Message {
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "import.v1.ImportParticipantsRequest";
  static fields = proto3.util.newFieldList(() => []);
  static fromBinary(bytes, options) {
    return new ImportParticipantsRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new ImportParticipantsRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new ImportParticipantsRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(ImportParticipantsRequest, a, b);
  }
}
class ImportParticipantsResponse extends Message {
  /**
   * @generated from field: bool success = 1;
   */
  success = false;
  /**
   * @generated from field: int32 total = 2;
   */
  total = 0;
  /**
   * @generated from field: int32 processed = 3;
   */
  processed = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "import.v1.ImportParticipantsResponse";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "success",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    },
    {
      no: 2,
      name: "total",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    },
    {
      no: 3,
      name: "processed",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    }
  ]);
  static fromBinary(bytes, options) {
    return new ImportParticipantsResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new ImportParticipantsResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new ImportParticipantsResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(ImportParticipantsResponse, a, b);
  }
}
class ImportSessionsRequest extends Message {
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "import.v1.ImportSessionsRequest";
  static fields = proto3.util.newFieldList(() => []);
  static fromBinary(bytes, options) {
    return new ImportSessionsRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new ImportSessionsRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new ImportSessionsRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(ImportSessionsRequest, a, b);
  }
}
class ImportSessionsResponse extends Message {
  /**
   * @generated from field: bool success = 1;
   */
  success = false;
  /**
   * @generated from field: int32 total = 2;
   */
  total = 0;
  /**
   * @generated from field: int32 processed = 3;
   */
  processed = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "import.v1.ImportSessionsResponse";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "success",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    },
    {
      no: 2,
      name: "total",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    },
    {
      no: 3,
      name: "processed",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    }
  ]);
  static fromBinary(bytes, options) {
    return new ImportSessionsResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new ImportSessionsResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new ImportSessionsResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(ImportSessionsResponse, a, b);
  }
}
class ImportEmotionsRequest extends Message {
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "import.v1.ImportEmotionsRequest";
  static fields = proto3.util.newFieldList(() => []);
  static fromBinary(bytes, options) {
    return new ImportEmotionsRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new ImportEmotionsRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new ImportEmotionsRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(ImportEmotionsRequest, a, b);
  }
}
class ImportEmotionsResponse extends Message {
  /**
   * @generated from field: bool success = 1;
   */
  success = false;
  /**
   * @generated from field: int32 total = 2;
   */
  total = 0;
  /**
   * @generated from field: int32 processed = 3;
   */
  processed = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "import.v1.ImportEmotionsResponse";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "success",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    },
    {
      no: 2,
      name: "total",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    },
    {
      no: 3,
      name: "processed",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    }
  ]);
  static fromBinary(bytes, options) {
    return new ImportEmotionsResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new ImportEmotionsResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new ImportEmotionsResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(ImportEmotionsResponse, a, b);
  }
}
class ImportTimelineRequest extends Message {
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "import.v1.ImportTimelineRequest";
  static fields = proto3.util.newFieldList(() => []);
  static fromBinary(bytes, options) {
    return new ImportTimelineRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new ImportTimelineRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new ImportTimelineRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(ImportTimelineRequest, a, b);
  }
}
class ImportTimelineResponse extends Message {
  /**
   * @generated from field: bool success = 1;
   */
  success = false;
  /**
   * @generated from field: int32 total = 2;
   */
  total = 0;
  /**
   * @generated from field: int32 processed = 3;
   */
  processed = 0;
  constructor(data) {
    super();
    proto3.util.initPartial(data, this);
  }
  static runtime = proto3;
  static typeName = "import.v1.ImportTimelineResponse";
  static fields = proto3.util.newFieldList(() => [
    {
      no: 1,
      name: "success",
      kind: "scalar",
      T: 8
      /* ScalarType.BOOL */
    },
    {
      no: 2,
      name: "total",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    },
    {
      no: 3,
      name: "processed",
      kind: "scalar",
      T: 5
      /* ScalarType.INT32 */
    }
  ]);
  static fromBinary(bytes, options) {
    return new ImportTimelineResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new ImportTimelineResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new ImportTimelineResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto3.util.equals(ImportTimelineResponse, a, b);
  }
}
const ImportService = {
  typeName: "import.v1.ImportService",
  methods: {
    /**
     * @generated from rpc import.v1.ImportService.ImportParticipants
     */
    importParticipants: {
      name: "ImportParticipants",
      I: ImportParticipantsRequest,
      O: ImportParticipantsResponse,
      kind: MethodKind.Unary
    },
    /**
     * @generated from rpc import.v1.ImportService.ImportSessions
     */
    importSessions: {
      name: "ImportSessions",
      I: ImportSessionsRequest,
      O: ImportSessionsResponse,
      kind: MethodKind.Unary
    },
    /**
     * @generated from rpc import.v1.ImportService.ImportEmotions
     */
    importEmotions: {
      name: "ImportEmotions",
      I: ImportEmotionsRequest,
      O: ImportEmotionsResponse,
      kind: MethodKind.Unary
    },
    /**
     * @generated from rpc import.v1.ImportService.ImportTimeline
     */
    importTimeline: {
      name: "ImportTimeline",
      I: ImportTimelineRequest,
      O: ImportTimelineResponse,
      kind: MethodKind.Unary
    }
  }
};
function getDefaultBaseUrl() {
  const { PUBLIC_API_URL } = runtimeConfig;
  if (typeof window !== "undefined") {
    return "/api";
  }
  return PUBLIC_API_URL || "https://spirit-in-physics.com/api";
}
const baseUrl = getDefaultBaseUrl();
const transport = createConnectTransport({ baseUrl });
createClient(ParticipantService, transport);
createClient(SessionService, transport);
createClient(TimelineService, transport);
createClient(StorageService, transport);
createClient(PreferenceService, transport);
createClient(ImportService, transport);

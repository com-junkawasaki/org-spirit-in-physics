package handlers

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"

	"connectrpc.com/connect"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	storagev1 "github.com/spirit-in-physics/services/grpc/gen/proto/storage/v1"
)

// StorageHandler handles storage service requests
type StorageHandler struct {
	minioClient *minio.Client
	repository  string
}

// NewStorageHandler creates a new StorageHandler
func NewStorageHandler() *StorageHandler {
	endpoint := os.Getenv("STORAGE_ENDPOINT")
	if endpoint == "" {
		endpoint = os.Getenv("MINIO_ENDPOINT")
		if endpoint == "" {
			endpoint = "storage.googleapis.com"
		}
	}

	accessKey := os.Getenv("STORAGE_ACCESS_KEY_ID")
	if accessKey == "" {
		accessKey = os.Getenv("MINIO_ROOT_USER")
		if accessKey == "" {
			accessKey = "" // GCS might use different auth, but HMAC uses this
		}
	}

	secretKey := os.Getenv("STORAGE_SECRET_ACCESS_KEY")
	if secretKey == "" {
		secretKey = os.Getenv("MINIO_ROOT_PASSWORD")
		if secretKey == "" {
			secretKey = ""
		}
	}

	useSSL := os.Getenv("STORAGE_USE_SSL") != "false" // Default to true for GCS
	repository := os.Getenv("STORAGE_BUCKET")
	if repository == "" {
		repository = "spirit-in-physics"
	}

	// Initialize minio client object (S3 compatible)
	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		log.Printf("Failed to initialize storage (S3) client: %v", err)
		return &StorageHandler{repository: repository}
	}

	ctx := context.Background()
	exists, err := minioClient.BucketExists(ctx, repository)
	if err != nil {
		log.Printf("Failed to check if bucket %s exists: %v", repository, err)
	} else if !exists {
		log.Printf("Bucket %s does not exist. Please create it.", repository)
	} else {
		log.Printf("Connected to storage bucket: %s", repository)
	}

	return &StorageHandler{
		minioClient: minioClient,
		repository:  repository,
	}
}

// UploadArtifact uploads an artifact to S3 compatible storage
func (h *StorageHandler) UploadArtifact(
	ctx context.Context,
	req *connect.Request[storagev1.UploadArtifactRequest],
) (*connect.Response[storagev1.UploadArtifactResponse], error) {
	if h.minioClient == nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("storage client not initialized"))
	}

	objectName := fmt.Sprintf("%s/%s/%s", req.Msg.ParticipantId, req.Msg.ArtifactType, req.Msg.FileName)
	contentType := req.Msg.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	reader := bytes.NewReader(req.Msg.FileData)
	size := int64(len(req.Msg.FileData))

	info, err := h.minioClient.PutObject(ctx, h.repository, objectName, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Generate a URL (this depends on the storage provider and network setup)
	var publicURL string
	if publicBaseURL := os.Getenv("STORAGE_PUBLIC_BASE_URL"); publicBaseURL != "" {
		publicURL = fmt.Sprintf("%s/%s", publicBaseURL, info.Key)
	} else if h.repository == "spirit-in-physics" && os.Getenv("STORAGE_ENDPOINT") == "" {
		// Default to GCS public URL if using defaults
		publicURL = fmt.Sprintf("https://storage.googleapis.com/%s/%s", h.repository, info.Key)
	} else {
		publicURL = fmt.Sprintf("http://spirit.localhost/storage/%s/%s", h.repository, info.Key)
	}

	return connect.NewResponse(&storagev1.UploadArtifactResponse{
		PublicUrl: publicURL,
	}), nil
}

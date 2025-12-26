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
	bucketName  string
}

// NewStorageHandler creates a new StorageHandler
func NewStorageHandler() *StorageHandler {
	endpoint := os.Getenv("MINIO_ENDPOINT")
	if endpoint == "" {
		endpoint = "infra-minio:9000"
	}
	accessKey := os.Getenv("MINIO_ROOT_USER")
	if accessKey == "" {
		accessKey = "minioadmin"
	}
	secretKey := os.Getenv("MINIO_ROOT_PASSWORD")
	if secretKey == "" {
		secretKey = "minioadmin"
	}
	useSSL := os.Getenv("MINIO_USE_SSL") == "true"
	bucketName := os.Getenv("MINIO_BUCKET_NAME")
	if bucketName == "" {
		bucketName = "spirit-in-physics"
	}

	// Initialize minio client object.
	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		log.Printf("Failed to initialize MinIO client: %v", err)
		return &StorageHandler{bucketName: bucketName}
	}

	// Make a new bucket.
	ctx := context.Background()
	err = minioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
	if err != nil {
		// Check to see if we already own this bucket (which happens if it's already been created)
		exists, errBucketExists := minioClient.BucketExists(ctx, bucketName)
		if errBucketExists == nil && exists {
			log.Printf("We already own %s\n", bucketName)
		} else {
			log.Printf("Failed to create bucket: %v", err)
		}
	} else {
		log.Printf("Successfully created %s\n", bucketName)
	}

	return &StorageHandler{
		minioClient: minioClient,
		bucketName:  bucketName,
	}
}

// UploadArtifact uploads an artifact to MinIO
func (h *StorageHandler) UploadArtifact(
	ctx context.Context,
	req *connect.Request[storagev1.UploadArtifactRequest],
) (*connect.Response[storagev1.UploadArtifactResponse], error) {
	if h.minioClient == nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("minio client not initialized"))
	}

	objectName := fmt.Sprintf("%s/%s/%s", req.Msg.ParticipantId, req.Msg.ArtifactType, req.Msg.FileName)
	contentType := req.Msg.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	reader := bytes.NewReader(req.Msg.FileData)
	size := int64(len(req.Msg.FileData))

	info, err := h.minioClient.PutObject(ctx, h.bucketName, objectName, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Generate a public URL (this assumes MinIO is accessible or configured for public/presigned URLs)
	// For now, return a simple path based on the endpoint
	publicURL := fmt.Sprintf("http://minio.127.0.0.1.nip.io/%s/%s", h.bucketName, info.Key)

	return connect.NewResponse(&storagev1.UploadArtifactResponse{
		PublicUrl: publicURL,
	}), nil
}


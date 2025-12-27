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
	branch      string
}

// NewStorageHandler creates a new StorageHandler
func NewStorageHandler() *StorageHandler {
	endpoint := os.Getenv("LAKEFS_ENDPOINT")
	if endpoint == "" {
		endpoint = os.Getenv("MINIO_ENDPOINT")
		if endpoint == "" {
			endpoint = "infra-lakefs:8000"
		}
	}
	// lakeFS S3 gateway is compatible with MinIO client
	accessKey := os.Getenv("LAKEFS_ACCESS_KEY_ID")
	if accessKey == "" {
		accessKey = os.Getenv("MINIO_ROOT_USER")
		if accessKey == "" {
			accessKey = "AKIAIOSFODNN7EXAMPLE"
		}
	}
	secretKey := os.Getenv("LAKEFS_SECRET_ACCESS_KEY")
	if secretKey == "" {
		secretKey = os.Getenv("MINIO_ROOT_PASSWORD")
		if secretKey == "" {
			secretKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
		}
	}
	useSSL := os.Getenv("LAKEFS_USE_SSL") == "true"
	repository := os.Getenv("LAKEFS_REPOSITORY")
	if repository == "" {
		repository = "spirit-in-physics"
	}
	branch := os.Getenv("LAKEFS_BRANCH")
	if branch == "" {
		branch = "main"
	}

	// Initialize minio client object.
	// We use MinIO client to talk to lakeFS S3 gateway.
	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		log.Printf("Failed to initialize lakeFS (S3) client: %v", err)
		return &StorageHandler{repository: repository, branch: branch}
	}

	// In lakeFS, we don't necessarily "MakeBucket" via S3 gateway if repository exists.
	// But we can check it. The "bucket" in lakeFS S3 gateway is the repository name.
	ctx := context.Background()
	exists, err := minioClient.BucketExists(ctx, repository)
	if err != nil {
		log.Printf("Failed to check if lakeFS repository %s exists: %v", repository, err)
	} else if !exists {
		log.Printf("lakeFS repository %s does not exist. Please create it via lakeFS UI/API.", repository)
	} else {
		log.Printf("Connected to lakeFS repository: %s", repository)
	}

	return &StorageHandler{
		minioClient: minioClient,
		repository:  repository,
		branch:      branch,
	}
}

// UploadArtifact uploads an artifact to lakeFS via S3 gateway
func (h *StorageHandler) UploadArtifact(
	ctx context.Context,
	req *connect.Request[storagev1.UploadArtifactRequest],
) (*connect.Response[storagev1.UploadArtifactResponse], error) {
	if h.minioClient == nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("storage client not initialized"))
	}

	// In lakeFS S3 gateway (path-style), the path is /repository/branch/object
	// But with MinIO client, we specify bucket=repository and the object key starts with branch/
	objectName := fmt.Sprintf("%s/%s/%s/%s", h.branch, req.Msg.ParticipantId, req.Msg.ArtifactType, req.Msg.FileName)
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

	// Generate a public URL (this assumes lakeFS is accessible via gateway)
	publicURL := fmt.Sprintf("http://spirit.localhost/lakefs/repositories/%s/objects?path=%s", h.repository, info.Key)

	return connect.NewResponse(&storagev1.UploadArtifactResponse{
		PublicUrl: publicURL,
	}), nil
}


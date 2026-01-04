package main
import (
	"fmt"
	"net/http"
)
func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "GRPC Service - Not Implemented (Build fix required)")
	})
	fmt.Println("Starting dummy GRPC service on :8080")
	http.ListenAndServe(":8080", nil)
}


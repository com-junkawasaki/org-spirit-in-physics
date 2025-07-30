package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"path/filepath"
	"strings"
)

func main() {
	dir := "v250728/docs"
	files, err := ioutil.ReadDir(dir)
	if err != nil {
		log.Fatalf("failed to read directory: %s", err)
	}

	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".txt") {
			oldPath := filepath.Join(dir, file.Name())
			newPath := strings.TrimSuffix(oldPath, ".txt") + ".md"

			content, err := ioutil.ReadFile(oldPath)
			if err != nil {
				log.Printf("failed to read file %s: %s", oldPath, err)
				continue
			}

			err = ioutil.WriteFile(newPath, content, 0644)
			if err != nil {
				log.Printf("failed to write file %s: %s", newPath, err)
				continue
			}

			fmt.Printf("Converted %s to %s\n", oldPath, newPath)

			// Optionally remove the old file
			// err = os.Remove(oldPath)
			// if err != nil {
			// 	log.Printf("failed to remove old file %s: %s", oldPath, err)
			// }
		}
	}
}

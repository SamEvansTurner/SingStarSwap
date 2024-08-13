package main

import (
	"embed"
)

// Embed the static generated Angular from the previous build step.
//
//go:embed static
var embedWebApp embed.FS

func main() {

	// Display usage/help message

}

# Dockerfile for Svelte App
FROM node:20-alpine

WORKDIR /app

# Copy the build result from Nix (copied to dist-svelte)
COPY dist-svelte/build ./build
COPY dist-svelte/package.json ./package.json
COPY apps/svelte-app/replace-env.sh ./replace-env.sh
RUN chmod +x ./replace-env.sh

# Install only production dependencies
# Since Nix build already happened, we just need to run the index.js
# But adapter-node might need some runtime libs. 
# Usually everything is bundled.

ENV PORT=80
ENV NODE_ENV=production

EXPOSE 80

CMD ["/bin/sh", "-c", "/app/replace-env.sh /app/build && node build/index.js"]


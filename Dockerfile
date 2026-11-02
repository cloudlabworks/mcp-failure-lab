FROM node:24-alpine@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f
LABEL io.modelcontextprotocol.server.name="io.github.cloudlabworks/mcp-failure-lab"
LABEL org.opencontainers.image.source="https://github.com/cloudlabworks/mcp-failure-lab"
LABEL org.opencontainers.image.licenses="MIT"
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY --chown=node:node server.mjs runner.mjs config.mjs ./
COPY --chown=node:node test ./test
COPY --chown=node:node lab ./lab
USER node
CMD ["node","server.mjs"]

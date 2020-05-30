FROM node:12.16.3-alpine3.11

RUN yarn global add serve

ENV PORT=5000
EXPOSE 5000

COPY ./build ./build

ENTRYPOINT [ "serve", "build" ]
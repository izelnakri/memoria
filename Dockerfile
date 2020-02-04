FROM node:13.7

RUN apt-get update && \
  apt-get install -y lsof vim ts-node typescript

WORKDIR /code/

ADD package-lock.json /code/package-lock.json
ADD package.json /code/package.json

RUN npm install

ADD memserver-boilerplate /code/memserver-boilerplate
ADD src /code/lib
RUN npm run build
ADD . /code/

ENTRYPOINT "/bin/bash"

FROM node:16.0.0-alpine3.13

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

EXPOSE 3000

CMD [ "node", "server.js" ]


# Build:
# 	docker build . -t starnutoditopo/flight-player
# Run:
# 	docker run -it --init -p 3000:3000 --rm starnutoditopo/flight-player
# Navigate with a browser to:
#	http://localhost:3000/
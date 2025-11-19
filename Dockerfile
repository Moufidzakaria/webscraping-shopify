# Dockerfile
FROM node:22

# Set working directory
WORKDIR /usr/src/app

# Copy package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers
COPY . .

# Build TypeScript si nécessaire
# RUN npm run build

# Expose le port
EXPOSE 3000

# Commande par défaut
CMD ["npm", "run", "start:dev"]

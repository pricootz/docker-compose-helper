// Esempi di template Docker Compose comuni
export const dockerComposeTemplates = {
  lamp: {
    name: "LAMP Stack (Linux, Apache, MySQL, PHP)",
    icon: "database",
    description: "Stack completo per sviluppo web PHP con Apache e MySQL. Include phpMyAdmin per la gestione del database.",
    template: `version: '3'

services:
  # Apache + PHP service
  webserver:
    image: php:8.1-apache
    container_name: lamp-webserver
    ports:
      - "\${HTTP_PORT:-80}:80"
    volumes:
      - ./app:/var/www/html
    depends_on:
      - database
    environment:
      - MYSQL_HOST=database
      - MYSQL_USER=\${MYSQL_USER:-user}
      - MYSQL_PASSWORD=\${MYSQL_PASSWORD:-password}
      - MYSQL_DATABASE=\${MYSQL_DATABASE:-lamp_db}

  # MySQL Service
  database:
    image: mysql:8.0
    container_name: lamp-database
    ports:
      - "\${DB_PORT:-3306}:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=\${MYSQL_ROOT_PASSWORD:-root_password}
      - MYSQL_DATABASE=\${MYSQL_DATABASE:-lamp_db}
      - MYSQL_USER=\${MYSQL_USER:-user}
      - MYSQL_PASSWORD=\${MYSQL_PASSWORD:-password}
    volumes:
      - mysql_data:/var/lib/mysql
      
  # phpMyAdmin
  phpmyadmin:
    image: phpmyadmin/phpmyadmin
    container_name: lamp-phpmyadmin
    ports:
      - "\${PHPMYADMIN_PORT:-8080}:80"
    environment:
      - PMA_HOST=database
      - PMA_PORT=3306
    depends_on:
      - database

volumes:
  mysql_data:
`
  },
  wordpress: {
    name: "WordPress",
    icon: "fileText",
    description: "Ambiente WordPress completo con database MySQL per lo sviluppo o hosting di siti web WordPress.",
    template: `version: '3'

services:
  # WordPress
  wordpress:
    image: wordpress:latest
    container_name: wordpress-site
    ports:
      - "\${WP_PORT:-80}:80"
    environment:
      - WORDPRESS_DB_HOST=db
      - WORDPRESS_DB_USER=\${WP_DB_USER:-wordpress}
      - WORDPRESS_DB_PASSWORD=\${WP_DB_PASSWORD:-wordpress}
      - WORDPRESS_DB_NAME=\${WP_DB_NAME:-wordpress}
    volumes:
      - wordpress_data:/var/www/html
    depends_on:
      - db

  # MySQL Database
  db:
    image: mysql:5.7
    container_name: wordpress-db
    environment:
      - MYSQL_ROOT_PASSWORD=\${MYSQL_ROOT_PASSWORD:-root_password}
      - MYSQL_DATABASE=\${WP_DB_NAME:-wordpress}
      - MYSQL_USER=\${WP_DB_USER:-wordpress}
      - MYSQL_PASSWORD=\${WP_DB_PASSWORD:-wordpress}
    volumes:
      - db_data:/var/lib/mysql

volumes:
  wordpress_data:
  db_data:
`
  },
  mern: {
    name: "MERN Stack (MongoDB, Express, React, Node.js)",
    icon: "code",
    description: "Stack completo per applicazioni JavaScript con MongoDB, Express, React e Node.js, ideale per sviluppo full-stack JavaScript.",
    template: `version: '3'

services:
  # Frontend React App
  frontend:
    image: node:16-alpine
    container_name: mern-frontend
    working_dir: /app
    volumes:
      - ./frontend:/app
    ports:
      - "\${FRONTEND_PORT:-3000}:3000"
    command: sh -c "npm install && npm start"
    environment:
      - NODE_ENV=\${NODE_ENV:-development}
      - REACT_APP_API_URL=http://localhost:\${BACKEND_PORT:-4000}/api
    depends_on:
      - backend

  # Backend Node.js API
  backend:
    image: node:16-alpine
    container_name: mern-backend
    working_dir: /app
    volumes:
      - ./backend:/app
    ports:
      - "\${BACKEND_PORT:-4000}:4000"
    command: sh -c "npm install && npm start"
    environment:
      - NODE_ENV=\${NODE_ENV:-development}
      - MONGODB_URI=mongodb://mongodb:27017/\${DB_NAME:-mern_db}
      - PORT=4000
      - JWT_SECRET=\${JWT_SECRET:-your_jwt_secret}
    depends_on:
      - mongodb

  # MongoDB
  mongodb:
    image: mongo:latest
    container_name: mern-mongodb
    ports:
      - "\${MONGO_PORT:-27017}:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
`
  },
  nginx_proxy: {
    name: "Nginx Reverse Proxy",
    icon: "server",
    description: "Configurazione Nginx come reverse proxy per le tue applicazioni web, con supporto per più servizi e SSL.",
    template: `version: '3'

services:
  # Nginx Reverse Proxy
  nginx:
    image: nginx:latest
    container_name: nginx-proxy
    ports:
      - "\${HTTP_PORT:-80}:80"
      - "\${HTTPS_PORT:-443}:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/certs:/etc/nginx/certs
      - ./nginx/html:/usr/share/nginx/html
    restart: always
    depends_on:
      - app1
      - app2

  # Example Service 1
  app1:
    image: nginx:alpine
    container_name: app1
    volumes:
      - ./app1:/usr/share/nginx/html

  # Example Service 2
  app2:
    image: nginx:alpine
    container_name: app2
    volumes:
      - ./app2:/usr/share/nginx/html
`
  },
  postgres: {
    name: "PostgreSQL & pgAdmin",
    icon: "database",
    description: "Database PostgreSQL con interfaccia di amministrazione pgAdmin, pronto per lo sviluppo di applicazioni.",
    template: `version: '3'

services:
  # PostgreSQL
  postgres:
    image: postgres:latest
    container_name: postgres-db
    environment:
      - POSTGRES_USER=\${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_DB=\${POSTGRES_DB:-postgres}
    ports:
      - "\${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # pgAdmin
  pgadmin:
    image: dpage/pgadmin4
    container_name: pgadmin
    environment:
      - PGADMIN_DEFAULT_EMAIL=\${PGADMIN_EMAIL:-admin@example.com}
      - PGADMIN_DEFAULT_PASSWORD=\${PGADMIN_PASSWORD:-admin}
    ports:
      - "\${PGADMIN_PORT:-5050}:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
`
  }
};
### Flash Flood Guidance System (FFGS)

## Prerequisites

- An Ubuntu server
- A GitHub account
- Command-line familiarity
- Python version >= 3.8

## Setup Guide

### 1. Update Ubuntu Server
```
sudo apt update
sudo apt upgrade
sudo apt autoclean
sudo apt autoremove
```
### 2. Install necessary packages
```
sudo apt install python3-pip python3-dev python3-venv libpq-dev nginx curl supervisor
```

### 3. Create a new directory and python virtual env
```
mkdir /home/ubuntu/ffgs_proj

// Install virtual environment 
python3 -m venv <YOUR_VIRTUAL_ENV_NAME>
```
### 4. Download and setup the mrc_ffgs from git
```
// git clone
git clone https://github.com/SERVIRSEA/mrc_ffgs.git

// Change directory
cd mrc_ffgs

// Rename the directory 
sudo mv mrc_ffgs ffgs

// Install dependencies
pip install django gunicorn pandas geopandas numpy
```

### 6. Create and config settings.py file
```
// Navigate to ffgs directory
cd ffgs

// Modify ecample settings.py file as settings.py
sudo nano settings.py

// Add Secret Key, Allowed Hosts, Debug 
SECRET_KEY = "< your_sevcet_key >"

DEBUG = True

ALLOWED_HOSTS = ["Your_server_domain_or_IP_address"]

```
### 7. Migrate database and create superuser to access Django admin panel
```
// Back to ffgs directory
cd ..

// Now migrate by
python manage.py makemigrations
pythton mange.py migrate

// Create superuser
python manage.py createsuperuser

# You will have to select a username, provide an email address, and choose and confirm a password.
```
### 8. Collect static files to static directory
```
python manage.py collectstatic

# It will collect all of the static files in a static directory defined in the settings.py
```

### 9. Test Django server
```
// Allow 8000 port to UFW firewall
sudo UFW allow 8000

// Check server by 
python manage.py runserver 0.0.0.0:8000

// Now open a browser and check the development server by typing
http://server_domain_or_IP:8000
```
### 10. Testing Gunicorn’s Ability to Serve the Project
```
gunicorn --bind 0.0.0.0:8000 rat.wsgi

// Now open a browser and check the development server with gunicorn by typing
http://server_domain_or_IP:8000

// Now deactivate the development server by typing
deactivate
```

### 11. Create a Supervisor configuration file
```
sudo nano /etc/supervisor/conf.d/ffgs.conf

// Add the following code
[program:ffgs]
directory=/home/ubuntu/ffgs_proj/ffgs
command=/home/ubuntu/ffgs_proj/ffgs_env/bin/gunicorn ffgs.wsgi:application -b 127.0.0.1:8000
user=ubuntu
autostart=true
autorestart=true
redirect_stderr=true

```

### 12. Configure Nginx for Django
```
// First, remove default Nginx configuration:
sudo rm /etc/nginx/sites-enabled/default

// Now create a new configuration for ffgs project:
sudo nano /etc/nginx/sites-available/ffgs

// Add below script and modify
server {
    listen 80;
    server_name <DOMAIN/IP_OF_YOUR_SERVER>;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location static/ {
        alias /home/ubuntu/ffgs_proj/;
    }

    location media/ {
        alias /home/ubuntu/ffgs_proj/;
    }
}

// Now save and exit

// Enable the file by linking it to the sites-enabled directory
sudo ln -s /etc/nginx/sites-available/ffgs /etc/nginx/sites-enabled
```
### Test and configure NGINX
```
// Test NGINX  Server
sudo nginx -t

// Restart NGINX Server
sudo systemctl restart nginx

// Delete 8000 port access
sudo ufw delete allow 8000

// Allow NGINX Full to access port 80
sudo ufw allow 'Nginx Full'

// Finally, restart everything
sudo systemctl daemon-reload
sudo systemctl restart supervisor
sudo nginx -t && sudo systemctl restart nginx
```
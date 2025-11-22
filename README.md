

```bash
# Build image
docker build -t quick-app .

# Run container
docker run -d -p 3000:3000 --name my-app quick-app

# Test
curl http://localhost:3000
# Should return: {"message":"Hello Docker!","container":"..."}

# View running containers
docker ps

# Check logs
docker logs my-app

# Stop container
docker stop my-app && docker rm my-app
```


K3S Setup

```bash
# Install (Linux/Mac)
curl -sfL https://get.k3s.io | sh -

# Setup kubectl access
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config 2>/dev/null || true
sudo chown $(id -u):$(id -g) ~/.kube/config 2>/dev/null || true
export KUBECONFIG=~/.kube/config

# Verify installation
kubectl get nodes



curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--node-ip=192.168.0.108" sh -
sudo systemctl start k3s
sudo systemctl status k3s
kubectl get nodes
sudo /usr/local/bin/k3s-uninstall.sh

```



Deployment manifest 

```bash
# Create deployment
cat > deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quick-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: quick-app
  template:
    metadata:
      labels:
        app: quick-app
    spec:
      containers:
      - name: app
        image: quick-app:latest
        ports:
        - containerPort: 3000
        imagePullPolicy: Never
---
apiVersion: v1
kind: Service
metadata:
  name: quick-app-service
spec:
  selector:
    app: quick-app
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
EOF
```


```bash
# Deploy to Kubernetes
kubectl apply -f deployment.yaml

# Check status
kubectl get pods
kubectl get services

# Test application
kubectl port-forward service/quick-app-service 8080:80 &
curl http://localhost:8080

# Scale application
kubectl scale deployment quick-app --replicas=4
kubectl get pods

# Essential kubectl commands
kubectl get all                                    # List all resources
kubectl describe pod <pod-name>   # Detailed info
kubectl logs <pod-name>                 # Container logs  
kubectl exec -it <pod> -- /bin/sh       # Shell into container
kubectl delete -f deployment.yaml    # Remove resources
```


```yaml
# Commit and push
name: Quick Deploy

on:
  push:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      # Test phase
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install and test
        run: |
          npm ci
          echo "✅ Tests passed!"
      
      # Build and Push phase
      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/quick-app:latest

      # Deploy phase
      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            # Pull the latest image from Docker Hub
            docker pull ${{ secrets.DOCKERHUB_USERNAME }}/quick-app:latest
            
            # Stop and remove the old container, if it exists
            docker stop my-quick-app || true
            docker rm my-quick-app || true
            
            # Run the new container from the updated image
            docker run -d -p 80:3000 --name my-quick-app ${{ secrets.DOCKERHUB_USERNAME }}/quick-app:latest
```
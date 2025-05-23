# Projeto3

Projeto3 é uma aplicação Full Stack para gestão de projetos com sprints e Curva S. O sistema foi construído com **Angular no frontend**, **Node.js (Express) no backend**, e **MongoDB como banco de dados**. Ele pode ser executado tanto via Docker quanto em um cluster Kubernetes.

---

## 🛡️ Arquitetura do Projeto

A arquitetura é baseada em três componentes principais:

```
[ Angular Frontend ] ⇄ [ Node.js Backend ] ⇄ [ MongoDB ]
```

* **Frontend**: Aplicação Angular servida em um container Nginx. Interface do usuário para visualização e interação com dados de empresas, projetos, sprints e entregas.
* **Backend**: API REST construída com Express.js. Gerencia autenticação, empresas, projetos e sprints. Usa variáveis de ambiente para configurar conexão com o banco.
* **Banco de Dados**: MongoDB rodando em container, persistência via volume Docker (`mongo_data`) e serviço exposto via Kubernetes.

---

## ▶️ Como rodar com Docker

### Pré-requisitos

* Docker e Docker Compose instalados

### Passos

1. No diretório do projeto, execute:

```bash
docker-compose up --build
```

2. A aplicação ficará disponível em:

* Frontend: `http://localhost:4200`
* Backend: não exposto diretamente, mas acessível pelo frontend.
* MongoDB: `localhost:27017` (via container `mongo`)

---

## ☕️ Como rodar com Kubernetes

### Pré-requisitos

* Minikube ou cluster Kubernetes
* `kubectl` instalado

### Passos com Minikube

1. Inicie o Minikube (caso esteja usando):

```bash
minikube start
```

2. Aplique os arquivos Kubernetes:

```bash
kubectl apply -f k8s/
```

3. Exponha o serviço do frontend:

```bash
minikube service frontend-service
```

Isso abrirá a aplicação Angular no navegador.

### Passos com AKS (Azure Kubernetes Service)

1. Certifique-se de ter o AKS criado e `kubectl` configurado:

```bash
az aks get-credentials --resource-group <nome-do-grupo> --name <nome-do-cluster>
```

2. Aplique os manifests:

```bash
kubectl apply -f k8s/
```

3. Para acessar o frontend, você pode expor o `frontend-service` usando um `LoadBalancer` ou configurar um Ingress Controller com o `ingress.yml`:

```bash
kubectl apply -f k8s/ingress.yml
```

4. Certifique-se de que o DNS ou IP externo está configurado corretamente para acesso via navegador.

---

## 📄 Estrutura do Banco de Dados (MongoDB)

O backend se conecta ao MongoDB via variável `MONGO_URI`.

### Nome do banco: `gestao-projetos`

### Principais coleções:

* `usuarios`:

  * `tipo`: `'adm'` ou `'filho'`
  * `empresaId`: vínculo com empresa
  * `projetosIds`: array de ObjectId de projetos

* `empresas`:

  * `adminId`: ID do usuário adm
  * `projetos`: projetos da empresa

* `projetos`:

  * `nome`, `descricao`
  * `usuarios`: membros do projeto
  * `sprints`: lista de sprints

* `sprints`:

  * `dataInicio`, `dataFim`, `concluida`
  * `entregas`: atividades atribuídas

---

## 🔐 Instruções de Autenticação

O backend utiliza autenticação com tokens JWT. As rotas protegidas exigem envio de token via header.

### Fluxo:

1. **Login** (`POST /login`)

   * Entrada: `email`, `senha`
   * Saída: token JWT

2. **Uso do token**:

   * Em cada requisição autenticada, envie:

     ```http
     Authorization: Bearer <token>
     ```

3. **Registro** (`POST /register`)

   * Admins podem registrar outros usuários `filho`.

---

---

Para dúvidas, abra uma issue ou entre em contato com os colaboradores do repositório.

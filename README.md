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

# 🛡️ Medidas de Segurança Implementadas no Projeto

Esta parte apresenta de forma objetiva todas as **medidas de segurança ativamente implementadas** no sistema, abrangendo autenticação, proteção contra ataques e práticas seguras de armazenamento.

---

## ✅ 1. Autenticação Segura

- **JWT (JSON Web Token)**:
  - Geração no login com `jwt.sign(...)`
  - Expiração configurada (`1h`)
  - Payload inclui `id` e `tipo` do usuário

- **Refresh Token Seguro**:
  - Armazenado com hash SHA-256 no banco de dados
  - Enviado via cookie `httpOnly` com:
    - `sameSite: 'Strict'`
    - `maxAge`: 7 dias
    - `secure: true` (apenas em produção)

---

## 🔐 2. Armazenamento de Senhas

- As senhas são criptografadas com `bcrypt`:
  - Fator de custo: 10
  - Nunca armazenadas em texto puro

---

## 🌐 3. Proteção CORS

- O backend Express está configurado com `cors` e política de **origem restrita**:
  - Apenas `http://localhost:4200` é aceito como origem.
  - Outras origens recebem erro 500 com `Not allowed by CORS`.
- Middleware responde corretamente a requisições **preflight (OPTIONS)**.
- O uso de `credentials: true` permite cookies seguros sem exposição a outras origens.

---

## ⚙️ 4. Rate Limiting

- Implementado com `express-rate-limit`
  - Limite: 100 requisições por IP a cada 15 minutos
  - Headers de controle (`X-RateLimit-*`) visíveis nas respostas

---

## 📦 5. Cookies Seguros

- Refresh token armazenado em cookie:
  - `httpOnly`: impede acesso via JavaScript
  - `sameSite: 'Strict'`: bloqueia envio automático em requisições de terceiros
  - `secure: true` ativado automaticamente em ambiente de produção (`NODE_ENV=production`)

---

## 📁 6. Variáveis de Ambiente

- Segredos e configurações como `JWT_SECRET` e `MONGO_URL` estão armazenados em `.env`
  - Mantidos fora do código-fonte

---

## 🧾 7. Logging de Requisições

- Middleware de log registra:
  - IP da requisição
  - Método HTTP e rota
  - Dados do corpo (exceto senha)
  - Usuário autenticado (se disponível)

---

## 🌐 8. Proxy Reverso com NGINX

- Redireciona `/api/*` para `http://backend:3000`.
- Vantagens:
  - Roteamento limpo no Angular.
  - CORS simplificado.
  - Isolamento entre frontend e API.

## 📈 9. Monitoramento e Alertas no Grafana

- Acesse sua instância Grafana em http://<SEU-GRAFANA-URL>:3000 e faça login.

1. **Criação dos Data Sources**

A seguir estão as instruções para criar e usar os data sources no Grafana

- Acesse a aba connections → Data sources

- clique em add new data source

- selecione o prometheus, e no Connection coloque:
  "http://prometheus:9090"

- Clique em Save & test

- clique em add new data source

- selecione o loki, e no Connection coloque:
  "http://loki:3100"

- Clique em Save & test


1. **Criação dos Dashboards**

A seguir estão as instruções para criar e usar os recursos de visualização no Grafana

- Acesse a aba de Dashboards

- Clique em New → Import.

- Faça o upload do arquivo JSON que deseja, da pasta Grafana json no diretório do projeto:

 1. Dashboard-app-model.json

 2. Dashboard-infra-model.json

- Clique em Import.

- Ao importa, deve atualizar manualmente as views de cada dashboard, para que elas sejam referenciadas corretamente, só é preciso clicar no refresh na pagina de edição de cada uma.

2. **Criação dos Alertas**

A seguir estão as instruções para criar os alerta no Grafana

- Navegue em Alerting → Alert Rules → New alert rule.

  1. Primeiro Alerta (Backend OFF)
    - Coloque o nome do alerta

    - Codigo para o alerta:

      ```YAML
      count(kube_pod_status_phase{namespace="default",pod=~"backend-.*",phase="Running"})
      ```

    - Condition: WHEN QUERY IS BELOW 1

    - Adicione ou crie um folder

    - Adicione ou crie um evaluation group 

    - Vá em "Configure no data and error handling" e onde estiver No Data, selecione Alerting.

    - Configure as notificações 

    - Configure as mensagens de notificações

    - Por fim salve.

  2. Segundo Alerta (Erros HTTP)
    - Coloque o nome do alerta

    - Codigo para o alerta:

      ```YAML
      sum by (status_code) (increase(http_request_duration_seconds_count{job="backend", status_code=~"4..|5.."}[1m]))
      ```
    - Condition: WHEN QUERY IS ABOVE 0

    - Adicione ou crie um folder

    - Adicione ou crie um evaluation group 

    - Configure as notificações 

    - Configure as mensagens de notificações

    - Clique em "Link dashboard and panel"

    - Selecione o dashboard e o painel que queira linkar (No caso seria: Dashboard de Aplicação → Erros HTTP)

    - Por fim salve.
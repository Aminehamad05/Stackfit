pipeline {
    agent any
    options {
        timestamps()
        ansiColor('xterm')
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
        disableConcurrentBuilds(abortPrevious: true)
    }
    environment {
        DOCKER_REPO = 'stackfit'
        CHART_DIR = 'deploy/helm/stackfit'
        REGISTRY_HOST = 'docker.io/aminehamad'
        WEB_IMAGE     = "${REGISTRY_HOST}/careerpath-web"
        API_IMAGE     = "${REGISTRY_HOST}/careerpath-api"
        DOCKER_CREDENTIALS_ID = 'docker-registry-credentials'
        KUBECONFIG_CREDENTIALS_ID = 'k8s-kubeconfig'
        DEPLOYMENT_NAME = 'stackfit'
        GIT_SHORT_COMMIT          = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(8) : 'dev'}"
        IMAGE_TAG                 = "${env.BUILD_NUMBER}-${GIT_SHORT_COMMIT}"
    }
    stages {
        stage('Pre-flight & Linting') {
            parallel {
                stage('Lint Dockerfile') {
                    steps {
                        sh 'docker run --rm -i hadolint/hadolint hadolint --ignore DL3003 ./apps/web/Dockerfile'
                        sh 'docker run --rm -i hadolint/hadolint hadolint--ignore DL3003 ./apps/api/Dockerfile'
                    }
                }
                stage('Lint Helm Chart') {
                    steps {
                        sh 'helm lint ${CHART_DIR}'
                    }
                }
                stage('Secret Scanning') {
                    steps {
                        sh 'docker run --rm -v $(pwd):/app -w /app zricethezav/gitleaks:latest detect --source . --no-git --verbose'
                    }
                }
                stage('Install API Dependecies') {
                    steps {
                        sh 'npm config set cache /var/jenkins_home/.npm-cache'
                        sh 'npm ci --workspace ./apps/api --prefer-offline'
                    }
                }
            }
        }
        stage('Api Quality Checks') {
            parallel {
                stage('Api Typecheck') {
                    steps {
                        dir('apps/api'){
                            sh 'npm run typecheck'
                        }
                    }
                }
                stage ('Api Unit Tests') {
                    steps {
                        dir('apps/api'){
                            sh 'npm run test'
                        }
                    }
                }
            }
        }
        stage('Build & Push Docker Images') {
            steps {
              withCredentials([usernamePassword(
                credentialsId: "${DOCKER_CREDENTIALS_ID}",
                usernameVariable: 'DOCKER_USERNAME',
                passwordVariable: 'DOCKER_PASSWORD'
              )]){
                script{
                    sh ' echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin'
                    try {
                        parallel (
                        'Build & Push Web Image' : {
                            steps {
                                sh 'docker build -t ${WEB_IMAGE}:${IMAGE_TAG} ./apps/web'
                                sh 'docker push ${WEB_IMAGE}:${IMAGE_TAG}'
                                sh 'docker push ${WEB_IMAGE}:latest'
                            }
                        },
                        'Build & Push Api Image' : {
                            steps {
                                sh 'docker build -t ${API_IMAGE}:${IMAGE_TAG} ./apps/api'
                                sh 'docker push ${API_IMAGE}:${IMAGE_TAG}'
                                sh 'docker push ${API_IMAGE}:latest'
                            }
                        }
                        )
                    }   
                    finally {
                        sh 'docker logout'
                    }
                }
            }
            }
        }
        stage('Helm render & dry run') {
            steps {
                sh '''
                    helm template ${DEPLOYMENT_NAME} ${CHART_DIR} \
                        --set api.repository=${API_IMAGE} \
                        --set api.tag=${IMAGE_TAG} \
                        --set web.repository=${WEB_IMAGE} \
                        --set web.tag=${IMAGE_TAG} > rendered-manifests.yaml
                '''
            }
        }
        stage ('Deploying to kubernetes') {
            steps {
                withCredentials([file(credentialsId: "${KUBECONFIG_CREDENTIALS_ID}", variable: 'KUBECONFIG')]) {
                    sh '''
                        helm upgrade --install ${DEPLOYMENT_NAME} ${CHART_DIR} \
                            --set api.repository=${API_IMAGE} \
                            --set api.tag=${IMAGE_TAG} \
                            --set web.repository=${WEB_IMAGE} \
                            --set web.tag=${IMAGE_TAG} \
                            --wait --timeout 5m 
                    '''
                }
            }
        }
    }
    post {
        always {
            sh "docker rmi ${API_IMAGE}:${IMAGE_TAG} || true"
            sh "docker rmi ${WEB_IMAGE}:${IMAGE_TAG} || true"
            sh "docker rmi ${API_IMAGE}:latest || true"
            sh "docker rmi ${WEB_IMAGE}:latest || true"
            sh 'docker image prune -f'
        }
    }
}

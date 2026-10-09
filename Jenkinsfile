pipeline {
    agent { label 'docker' }
    options {
        timestamps()
        ansiColor('xterm')
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
        disableConcurrentBuilds(abortPrevious: true)
    }
    env {
        REGISTRY_HOST = 'docker.io/aminehamad'
        WEB_IMAGE     = "${REGISTRY_HOST}/careerpath-web"
        API_IMAGE     = "${REGISTRY_HOST}/careerpath-api"
        DOCKER_REPO = 'stackfit'
        DOCKER_CREDENTIALS_ID = 'docker-registry-credentials'
        KUBECONFIG_CREDENTIALS_ID = 'k8s-kubeconfig'
        CHART_DIR='deploy/helm/stackfit'
        GIT_SHORT_COMMIT          = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(8) : 'dev'}"
        IMAGE_TAG                 = "${env.BUILD_NUMBER}-${GIT_SHORT_COMMIT}"
    }
    stages {
        stage('Pre-flight & Linting') {
            parallel {
                stage('Lint Dockerfile') {
                    steps {
                        sh 'docker run --rm -i hadolint/hadolint < ./apps/web/Dockerfile'
                        sh 'docker run --rm -i hadolint/hadolint < ./apps/api/Dockerfile'
                    }
                }
                stage('Lint Helm Chart') {
                    steps {
                        sh 'helm lint ${CHART_DIR}'
                    }
                }
                stage('Secret Scanning') {
                    steps {
                        sh 'docker run --rm -v $(pwd):/app -w /app zricethezav/gitleaks:latest detect --source . --verbose'
                    }
                }
                stage('Install API Dependecies') {
                    steps {
                        dir('apps/api') {
                            sh 'npm config set cache /var/jenkins_home/.npm-cache'
                            sh 'npm -ci --prefer-offline'
                        }
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
    }

}
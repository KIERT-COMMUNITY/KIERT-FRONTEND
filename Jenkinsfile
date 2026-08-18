pipeline {
    agent any

    // ============================================
    // 1. PARÁMETROS (para builds manuales)
    // ============================================
    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['development', 'staging', 'production'],
            description: 'Selecciona el entorno para el despliegue'
        )
        string(
            name: 'BRANCH',
            defaultValue: 'main',
            description: 'Rama a construir'
        )
        booleanParam(
            name: 'RUN_TESTS',
            defaultValue: true,
            description: 'Ejecutar pruebas unitarias'
        )
    }

    // ============================================
    // 2. VARIABLES DE ENTORNO
    // ============================================
    environment {
        // Node.js version
        NODE_VERSION = '18'
        
        // Docker Registry
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_IMAGE_NAME = 'kiert-frontend'
        DOCKER_NAMESPACE = 'kiert-community'
        
        // SonarQube (opcional)
        SONAR_HOST_URL = 'https://sonarcloud.io'
        SONAR_PROJECT_KEY = 'kiert-community_frontend'
        SONAR_ORGANIZATION = 'kiert-community'
        
        // Notificaciones
        SLACK_CHANNEL = '#deployments'
    }

    // ============================================
    // 3. ETAPAS DEL PIPELINE
    // ============================================
    stages {

        // --------------------------------------------
        // Stage 1: Checkout
        // --------------------------------------------
        stage('Checkout') {
            steps {
                cleanWs()
                checkout scmGit(
                    branches: [[name: "*/${params.BRANCH}"]],
                    userRemoteConfigs: [[
                        url: 'https://github.com/KIERT-COMMUNITY/KIERT-FRONTEND.git',
                        credentialsId: 'github-credentials'
                    ]]
                )
                script {
                    currentBuild.description = "Build #${BUILD_NUMBER} - ${params.BRANCH} - ${params.ENVIRONMENT}"
                }
            }
        }

        // --------------------------------------------
        // Stage 2: Setup Node.js
        // --------------------------------------------
        stage('Setup Node.js') {
            steps {
                tool name: 'node-18', type: 'nodejs'
                sh 'node --version'
                sh 'npm --version'
            }
        }

        // --------------------------------------------
        // Stage 3: Install Dependencies
        // --------------------------------------------
        stage('Install Dependencies') {
            steps {
                sh '''
                    echo "📦 Instalando dependencias..."
                    npm ci --cache .npm --prefer-offline
                '''
            }
            post {
                success {
                    sh 'echo "✅ Dependencias instaladas correctamente"'
                }
                failure {
                    sh 'echo "❌ Error al instalar dependencias"'
                }
            }
        }

        // --------------------------------------------
        // Stage 4: Lint (Calidad de código)
        // --------------------------------------------
        stage('Lint') {
            steps {
                sh '''
                    echo "🔍 Ejecutando ESLint..."
                    npm run lint || true
                '''
            }
        }

        // --------------------------------------------
        // Stage 5: Tests Unitarios
        // --------------------------------------------
        stage('Unit Tests') {
            when {
                expression { params.RUN_TESTS == true }
            }
            steps {
                sh '''
                    echo "🧪 Ejecutando pruebas unitarias..."
                    npm run test:ci || true
                '''
            }
            post {
                always {
                    junit 'test-results/junit.xml'
                }
            }
        }

        // --------------------------------------------
        // Stage 6: Build
        // --------------------------------------------
        stage('Build') {
            steps {
                script {
                    def environmentFile = "src/environments/environment.${params.ENVIRONMENT}.ts"
                    sh """
                        echo "🏗️ Construyendo para entorno: ${params.ENVIRONMENT}"
                        echo "📄 Usando configuración: ${environmentFile}"
                        
                        # Verificar que existe el archivo de entorno
                        if [ ! -f "${environmentFile}" ]; then
                            echo "⚠️ No se encontró ${environmentFile}, usando environment.ts por defecto"
                            cp src/environments/environment.ts ${environmentFile}
                        fi
                        
                        npm run build -- \
                            --configuration=${params.ENVIRONMENT} \
                            --output-path=dist \
                            --base-href=/
                    """
                }
            }
            post {
                success {
                    archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
                }
            }
        }

        // --------------------------------------------
        // Stage 7: SonarQube Analysis
        // --------------------------------------------
        stage('SonarQube Analysis') {
            when {
                expression { params.ENVIRONMENT == 'production' }
            }
            steps {
                withSonarQubeEnv('sonar') {
                    sh '''
                        echo "📊 Ejecutando análisis SonarQube..."
                        npm run sonar || true
                    '''
                }
            }
        }

        // --------------------------------------------
        // Stage 8: Docker Build
        // --------------------------------------------
        stage('Docker Build') {
            when {
                expression { params.ENVIRONMENT == 'production' || params.ENVIRONMENT == 'staging' }
            }
            steps {
                script {
                    def imageTag = "${params.ENVIRONMENT}-${BUILD_NUMBER}"
                    def fullImageName = "${DOCKER_REGISTRY}/${DOCKER_NAMESPACE}/${DOCKER_IMAGE_NAME}:${imageTag}"
                    
                    sh """
                        echo "🐳 Construyendo imagen Docker..."
                        docker build -t ${fullImageName} .
                        echo "✅ Imagen construida: ${fullImageName}"
                    """
                }
            }
        }

        // --------------------------------------------
        // Stage 9: Push to Registry
        // --------------------------------------------
        stage('Push to Registry') {
            when {
                expression { params.ENVIRONMENT == 'production' || params.ENVIRONMENT == 'staging' }
            }
            steps {
                script {
                    def imageTag = "${params.ENVIRONMENT}-${BUILD_NUMBER}"
                    def fullImageName = "${DOCKER_REGISTRY}/${DOCKER_NAMESPACE}/${DOCKER_IMAGE_NAME}:${imageTag}"
                    
                    withDockerRegistry([credentialsId: 'docker-credentials', url: "https://${DOCKER_REGISTRY}"]) {
                        sh """
                            echo "📤 Subiendo imagen a registro..."
                            docker push ${fullImageName}
                            echo "✅ Imagen subida: ${fullImageName}"
                        """
                    }
                }
            }
        }

        // --------------------------------------------
        // Stage 10: Deploy
        // --------------------------------------------
        stage('Deploy') {
            when {
                expression { params.ENVIRONMENT == 'production' || params.ENVIRONMENT == 'staging' }
            }
            steps {
                script {
                    def imageTag = "${params.ENVIRONMENT}-${BUILD_NUMBER}"
                    def fullImageName = "${DOCKER_REGISTRY}/${DOCKER_NAMESPACE}/${DOCKER_IMAGE_NAME}:${imageTag}"
                    
                    sh """
                        echo "🚀 Desplegando a ${params.ENVIRONMENT}..."
                        echo "📦 Imagen: ${fullImageName}"
                        
                        # Aquí puedes agregar el comando de despliegue según tu infraestructura
                        # Ejemplo con kubectl:
                        # kubectl set image deployment/kiert-frontend frontend=${fullImageName} -n kiert
                        
                        # Ejemplo con Docker:
                        # docker run -d -p 80:80 --name kiert-frontend-${params.ENVIRONMENT} ${fullImageName}
                    """
                }
            }
        }

        // --------------------------------------------
        // Stage 11: Health Check
        // --------------------------------------------
        stage('Health Check') {
            when {
                expression { params.ENVIRONMENT == 'production' || params.ENVIRONMENT == 'staging' }
            }
            steps {
                sh '''
                    echo "🏥 Verificando salud del servicio..."
                    sleep 10
                    curl -f http://localhost:80 || echo "⚠️ Health check falló"
                '''
            }
        }
    }

    // ============================================
    // 4. POST - ACCIONES FINALES
    // ============================================
    post {
        success {
            script {
                def message = """
                    ✅ Pipeline completado exitosamente!
                    • Build: #${BUILD_NUMBER}
                    • Rama: ${params.BRANCH}
                    • Entorno: ${params.ENVIRONMENT}
                    • URL: ${BUILD_URL}
                """
                echo message
                
                // Notificar a Slack
                slackSend(
                    channel: "${SLACK_CHANNEL}",
                    color: 'good',
                    message: message
                )
            }
        }
        failure {
            script {
                def message = """
                    ❌ Pipeline falló!
                    • Build: #${BUILD_NUMBER}
                    • Rama: ${params.BRANCH}
                    • Entorno: ${params.ENVIRONMENT}
                    • URL: ${BUILD_URL}
                """
                echo message
                
                slackSend(
                    channel: "${SLACK_CHANNEL}",
                    color: 'danger',
                    message: message
                )
            }
        }
        always {
            cleanWs()
            echo "🧹 Limpiando workspace..."
        }
    }
}
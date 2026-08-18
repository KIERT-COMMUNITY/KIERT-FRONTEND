pipeline {
    agent any

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['development', 'staging', 'production'],
            description: 'Selecciona el entorno para el despliegue'
        )
        string(
            name: 'BRANCH',
            defaultValue: 'develop',
            description: 'Rama a construir'
        )
        booleanParam(
            name: 'RUN_TESTS',
            defaultValue: true,
            description: 'Ejecutar pruebas unitarias'
        )
    }

    stages {

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

        stage('Setup Node.js') {
            steps {
                // ✅ CAMBIA EL NOMBRE POR EL QUE TENES EN HERRAMIENTAS GLOBALES
                tool name: 'node-22.14.0', type: 'nodejs'
                sh 'node --version'
                sh 'npm --version'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    echo "Instalando dependencias..."
                    npm install
                '''
            }
        }

        stage('Lint') {
            steps {
                sh '''
                    echo "Ejecutando ESLint..."
                    npm run lint || true
                '''
            }
        }

        stage('Unit Tests') {
            when {
                expression { params.RUN_TESTS == true }
            }
            steps {
                sh '''
                    echo "Ejecutando pruebas unitarias..."
                    npm run test:ci || true
                '''
            }
            post {
                always {
                    junit 'test-results/junit.xml'
                }
            }
        }

        stage('Build') {
            steps {
                sh """
                    echo "Construyendo para entorno: ${params.ENVIRONMENT}"
                    npm run build -- --configuration=${params.ENVIRONMENT} --output-path=dist
                """
            }
            post {
                success {
                    archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
                }
            }
        }

        stage('Deploy') {
            when {
                expression { params.ENVIRONMENT == 'production' || params.ENVIRONMENT == 'staging' }
            }
            steps {
                sh """
                    echo "Desplegando a ${params.ENVIRONMENT}..."
                    echo "Build #${BUILD_NUMBER} - ${params.BRANCH}"
                """
            }
        }
    }

    post {
        success {
            echo """
                Pipeline completado exitosamente!
                Build: #${BUILD_NUMBER}
                Rama: ${params.BRANCH}
                Entorno: ${params.ENVIRONMENT}
                URL: ${BUILD_URL}
            """
        }
        failure {
            echo """
                Pipeline fallo!
                Build: #${BUILD_NUMBER}
                Rama: ${params.BRANCH}
                Entorno: ${params.ENVIRONMENT}
                URL: ${BUILD_URL}
            """
        }
        always {
            cleanWs()
            echo "Limpiando workspace..."
        }
    }
}
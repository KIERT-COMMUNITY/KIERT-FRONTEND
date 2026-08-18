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
                bat '''
                    echo "Verificando Node.js..."
                    node --version
                    npm --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                bat '''
                    echo "Instalando dependencias..."
                    npm install
                '''
            }
        }

        // ❌ ELIMINADO: Lint (no existe el script)
        // stage('Lint') { ... }

        // ❌ ELIMINADO: Unit Tests (no existe el script)
        // stage('Unit Tests') { ... }

        stage('Build') {
            steps {
                bat """
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
                bat """
                    echo "Desplegando a ${params.ENVIRONMENT}..."
                    echo "Build #${BUILD_NUMBER} - ${params.BRANCH}"
                """
            }
        }
    }

    post {
        success {
            bat """
                echo "Pipeline completado exitosamente!"
                echo "Build: #${BUILD_NUMBER}"
                echo "Rama: ${params.BRANCH}"
                echo "Entorno: ${params.ENVIRONMENT}"
                echo "URL: ${BUILD_URL}"
            """
        }
        failure {
            bat """
                echo "Pipeline fallo!"
                echo "Build: #${BUILD_NUMBER}"
                echo "Rama: ${params.BRANCH}"
                echo "Entorno: ${params.ENVIRONMENT}"
                echo "URL: ${BUILD_URL}"
            """
        }
        always {
            cleanWs()
            bat 'echo "Limpiando workspace..."'
        }
    }
}
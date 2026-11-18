import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "dev.chessoverlay"
    compileSdk = 34
    defaultConfig {
        applicationId = "dev.chessoverlay"
        minSdk = 30
        targetSdk = 34
        versionCode = 1
        versionName = "0.1"
        ndk { abiFilters += "arm64-v8a" }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    // Piece templates live in :core so the JVM tests and the app share one copy.
    sourceSets["main"].assets.srcDir("../core/src/main/resources")
    // Stockfish ships as libstockfish.so and is executed from the extracted native-lib dir.
    packaging { jniLibs { useLegacyPackaging = true } }
}
kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }

dependencies { implementation(project(":core")) }

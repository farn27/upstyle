import org.jetbrains.kotlin.gradle.ExperimentalKotlinGradlePluginApi
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidLibrary)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
}

kotlin {
    androidTarget {
        @OptIn(ExperimentalKotlinGradlePluginApi::class)
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_11)
        }
    }

    listOf(
        iosX64(),
        iosArm64(),
        iosSimulatorArm64()
    ).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "Shared"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            // Compose Multiplatform
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.materialIconsExtended)
            implementation(compose.ui)
            implementation(compose.components.resources)
            implementation(compose.components.uiToolingPreview)

            // Lifecycle
            implementation(libs.androidx.lifecycle.viewmodel)
            implementation(libs.androidx.lifecycle.runtime.compose)

            // Coroutines
            implementation(libs.kotlinx.coroutines.core)

            // Serialization
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.datetime)

            // Ktor HTTP client
            implementation(libs.ktor.client.core)
            implementation(libs.ktor.client.content.negotiation)
            implementation(libs.ktor.serialization.kotlinx.json)
            implementation(libs.ktor.client.logging)
            implementation(libs.ktor.client.auth)

            // Multiplatform Settings (SharedPreferences/UserDefaults)
            implementation(libs.multiplatform.settings)
            implementation(libs.multiplatform.settings.no.arg)

            // DI
            implementation(libs.koin.core)
            implementation(libs.koin.compose)

            // Logger
            implementation(libs.napier)

            // Image loading
            implementation(libs.coil.compose)
            implementation(libs.coil.network.ktor)
        }

        androidMain.dependencies {
            implementation("androidx.credentials:credentials:1.3.0")
            implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
            implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
            implementation(libs.ktor.client.okhttp)
            implementation(libs.kotlinx.coroutines.android)
            // Activity Compose — provides rememberLauncherForActivityResult
            implementation("androidx.activity:activity-compose:1.9.3")
            implementation("androidx.activity:activity:1.9.3")
            
            // Phase 2: Biometrics & Location (GPS)
            implementation("androidx.biometric:biometric:1.2.0-alpha05")
            // Pemindai barcode: kamera + ML Kit (model tergabung, bekerja tanpa Google Play Services)
            implementation("androidx.camera:camera-camera2:1.3.4")
            implementation("androidx.camera:camera-lifecycle:1.3.4")
            implementation("androidx.camera:camera-view:1.3.4")
            implementation("com.google.mlkit:barcode-scanning:17.3.0")
            implementation("com.google.android.gms:play-services-location:21.3.0")
            
            // Socket.io — Android only (no iOS equivalent in shared)
            implementation("io.socket:socket.io-client:2.1.1") {
                exclude(group = "org.json", module = "json")
            }
        }

        iosMain.dependencies {
            implementation(libs.ktor.client.darwin)
        }

        // Audit UI: render layar asli di JVM (Robolectric) + screenshot (Roborazzi)
        androidUnitTest.dependencies {
            implementation("junit:junit:4.13.2")
            implementation("org.robolectric:robolectric:4.14.1")
            implementation("io.github.takahirom.roborazzi:roborazzi:1.40.1")
            implementation("io.github.takahirom.roborazzi:roborazzi-compose:1.40.1")
            implementation("androidx.compose.ui:ui-test-junit4:1.9.0")
            implementation("com.russhwolf:multiplatform-settings-test:1.2.0")
        }
    }
}

android {
    namespace = "com.upstyle.bizgrow.shared"
    compileSdk = 35
    defaultConfig {
        minSdk = 24
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            all {
                it.systemProperty("robolectric.pixelCopyRenderMode", "hardware")
                it.systemProperty("roborazzi.test.record", "true")
                it.maxHeapSize = "3g"
                it.maxParallelForks = 3
                System.getenv("ROBOLECTRIC_REPO")?.let { url -> it.systemProperty("robolectric.dependency.repo.url", url) }
                // alamat server lokal & sesi uji dikirim lewat variabel lingkungan
                listOf("HP_SERVER", "HP_TOKEN", "HP_UNIT", "HP_LAYAR", "HP_PRODUK", "HP_PRODUK_VARIAN", "HP_TEMA", "HP_ALUR").forEach { k -> it.environment(k, System.getenv(k) ?: "") }
            }
        }
    }
}

dependencies {
    // ComponentActivity untuk createComposeRule di unit test
    "debugImplementation"("androidx.compose.ui:ui-test-manifest:1.9.0")
}

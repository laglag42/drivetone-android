plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
    namespace = "com.drivetone.studio"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.drivetone.studio"
        minSdk = 26
        targetSdk = 34
        versionCode = 5
        versionName = "5.0-debug"
    }
    buildTypes { release { isMinifyEnabled = false } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies { implementation("androidx.webkit:webkit:1.12.1") }

-keepnames class com.example.api.GoogleAuthRequest
-if class com.example.api.GoogleAuthRequest
-keep class com.example.api.GoogleAuthRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}

-keepnames class com.example.api.RegisterRequest
-if class com.example.api.RegisterRequest
-keep class com.example.api.RegisterRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}

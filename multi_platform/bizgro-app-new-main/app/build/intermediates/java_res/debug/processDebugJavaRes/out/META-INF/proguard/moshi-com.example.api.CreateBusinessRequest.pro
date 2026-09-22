-keepnames class com.example.api.CreateBusinessRequest
-if class com.example.api.CreateBusinessRequest
-keep class com.example.api.CreateBusinessRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}

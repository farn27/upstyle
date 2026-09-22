-keepnames class com.example.api.Content
-if class com.example.api.Content
-keep class com.example.api.ContentJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}

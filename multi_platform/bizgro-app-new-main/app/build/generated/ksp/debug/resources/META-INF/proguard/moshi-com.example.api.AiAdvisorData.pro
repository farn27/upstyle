-keepnames class com.example.api.AiAdvisorData
-if class com.example.api.AiAdvisorData
-keep class com.example.api.AiAdvisorDataJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}

-keepnames class com.example.api.GenerateContentRequest
-if class com.example.api.GenerateContentRequest
-keep class com.example.api.GenerateContentRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.GenerateContentRequest
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.GenerateContentRequest {
    public synthetic <init>(java.util.List,com.example.api.GenerationConfig,com.example.api.Content,int,kotlin.jvm.internal.DefaultConstructorMarker);
}

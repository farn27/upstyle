-keepnames class com.example.api.GenerationConfig
-if class com.example.api.GenerationConfig
-keep class com.example.api.GenerationConfigJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.GenerationConfig
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.GenerationConfig {
    public synthetic <init>(java.lang.Float,java.lang.Float,java.lang.Integer,int,kotlin.jvm.internal.DefaultConstructorMarker);
}

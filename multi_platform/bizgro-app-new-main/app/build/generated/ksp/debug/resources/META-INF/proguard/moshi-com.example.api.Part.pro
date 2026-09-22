-keepnames class com.example.api.Part
-if class com.example.api.Part
-keep class com.example.api.PartJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.Part
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.Part {
    public synthetic <init>(java.lang.String,int,kotlin.jvm.internal.DefaultConstructorMarker);
}

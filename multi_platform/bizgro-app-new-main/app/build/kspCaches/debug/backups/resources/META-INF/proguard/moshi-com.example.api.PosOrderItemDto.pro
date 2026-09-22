-keepnames class com.example.api.PosOrderItemDto
-if class com.example.api.PosOrderItemDto
-keep class com.example.api.PosOrderItemDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.PosOrderItemDto
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.PosOrderItemDto {
    public synthetic <init>(java.lang.String,java.lang.String,java.lang.String,java.lang.String,int,double,int,kotlin.jvm.internal.DefaultConstructorMarker);
}

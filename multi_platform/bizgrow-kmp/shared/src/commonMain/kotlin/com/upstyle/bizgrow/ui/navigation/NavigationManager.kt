package com.upstyle.bizgrow.ui.navigation

import com.upstyle.bizgrow.ui.Screen
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

// ---------------------------------------------------------------------------
// Workflow & context models
// ---------------------------------------------------------------------------

/**
 * Describes a multi-step business workflow that the user progresses through
 * (e.g., onboarding, purchase, HR approval).
 */
data class BusinessWorkflow(
    val id: String,
    val steps: List<String>,
    val canSkipSteps: Boolean = false,
    val requiresAuth: Boolean = true
)

/**
 * Carries contextual metadata for a navigation event so that destination
 * screens can render breadcrumbs and access parent-feature state.
 */
data class NavigationContext(
    val parentFeature: String,
    val breadcrumbs: List<String> = emptyList(),
    val state: Map<String, String> = emptyMap()
)

// ---------------------------------------------------------------------------
// NavigationManager
// ---------------------------------------------------------------------------

/**
 * Dedicated navigation manager to handle screen transitions and back stack.
 * Separates navigation concerns from business logic.
 */
class NavigationManager {

    // -----------------------------------------------------------------------
    // Core screen state
    // -----------------------------------------------------------------------

    private val _screen = MutableStateFlow<Screen>(Screen.Login)
    val screen: StateFlow<Screen> = _screen.asStateFlow()

    private val _screenStack = MutableStateFlow<List<Screen>>(listOf(Screen.Login))
    val screenStack: StateFlow<List<Screen>> = _screenStack.asStateFlow()

    // -----------------------------------------------------------------------
    // Breadcrumb state
    // -----------------------------------------------------------------------

    private val _breadcrumbs = MutableStateFlow<List<String>>(emptyList())
    val breadcrumbs: StateFlow<List<String>> = _breadcrumbs.asStateFlow()

    // -----------------------------------------------------------------------
    // Workflow tracking: workflowId -> stack index at which workflow started
    // -----------------------------------------------------------------------

    private val _workflowStartIndices = mutableMapOf<String, Int>()

    // -----------------------------------------------------------------------
    // Core navigation
    // -----------------------------------------------------------------------

    /**
     * Navigate to a new screen, adding it to the back stack.
     */
    fun navigate(screen: Screen) {
        _screenStack.value = _screenStack.value + screen
        _screen.value = screen
    }

    /**
     * Navigate back to the previous screen in the stack.
     * @return true if navigation was successful, false if already at root.
     */
    fun navigateBack(): Boolean {
        val stack = _screenStack.value
        return if (stack.size > 1) {
            val newStack = stack.dropLast(1)
            _screenStack.value = newStack
            _screen.value = newStack.last()
            true
        } else {
            false
        }
    }

    /**
     * Navigate to a screen and clear the entire back stack
     * (e.g., after login/logout).
     */
    fun navigateToRoot(screen: Screen) {
        _screenStack.value = listOf(screen)
        _screen.value = screen
        _breadcrumbs.value = emptyList()
        _workflowStartIndices.clear()
    }

    /**
     * Clear the entire navigation stack and reset to initial state.
     */
    fun reset() {
        _screenStack.value = listOf(Screen.Login)
        _screen.value = Screen.Login
        _breadcrumbs.value = emptyList()
        _workflowStartIndices.clear()
    }

    // -----------------------------------------------------------------------
    // Context-aware navigation
    // -----------------------------------------------------------------------

    /**
     * Navigate to [screen] and update breadcrumbs from the supplied [context].
     * The context breadcrumbs replace the current breadcrumb trail so the UI
     * can render a consistent path from the parent feature to the current screen.
     */
    fun navigateWithContext(screen: Screen, context: NavigationContext) {
        navigate(screen)
        _breadcrumbs.value = context.breadcrumbs
    }

    // -----------------------------------------------------------------------
    // Workflow helpers
    // -----------------------------------------------------------------------

    /**
     * Mark the start of a workflow with [workflowId] at the current stack
     * position, so it can be unwound later via [clearWorkflowStack].
     */
    fun beginWorkflow(workflowId: String) {
        // Record the index of the screen that was current *before* the
        // workflow starts, so we can pop back to it.
        _workflowStartIndices[workflowId] = _screenStack.value.size - 1
    }

    /**
     * Pop the navigation stack back to the screen that existed before
     * [workflowId] was started (as recorded by [beginWorkflow]).
     * If the workflow was never registered, this is a no-op.
     */
    fun clearWorkflowStack(workflowId: String) {
        val startIndex = _workflowStartIndices.remove(workflowId) ?: return
        val stack = _screenStack.value
        if (startIndex < stack.size) {
            val newStack = stack.subList(0, startIndex + 1)
            _screenStack.value = newStack
            _screen.value = newStack.last()
        }
    }

    // -----------------------------------------------------------------------
    // History access
    // -----------------------------------------------------------------------

    /**
     * Returns a snapshot copy of the current screen stack so callers cannot
     * mutate internal state.
     */
    fun getNavigationHistory(): List<Screen> = _screenStack.value.toList()

    // -----------------------------------------------------------------------
    // Convenience properties
    // -----------------------------------------------------------------------

    /** Current depth of the navigation stack (useful for debugging). */
    val stackDepth: Int
        get() = _screenStack.value.size

    /** Whether the user can navigate back from the current screen. */
    val canNavigateBack: Boolean
        get() = _screenStack.value.size > 1
}

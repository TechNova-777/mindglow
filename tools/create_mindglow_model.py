import bpy
import math
from pathlib import Path
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "3d"
ASSET_DIR.mkdir(parents=True, exist_ok=True)
BLEND_PATH = ASSET_DIR / "mindglow-companion.blend"
GLB_PATH = ASSET_DIR / "mindglow-companion.glb"


def set_input(node, name, value):
    socket = node.inputs.get(name)
    if socket is not None:
        socket.default_value = value


def material(name, color, metallic=0.0, roughness=0.5, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    set_input(bsdf, "Base Color", (*color, 1.0))
    set_input(bsdf, "Metallic", metallic)
    set_input(bsdf, "Roughness", roughness)
    if emission:
        set_input(bsdf, "Emission Color", (*emission, 1.0))
        set_input(bsdf, "Emission Strength", emission_strength)
    return mat


def apply_material(obj, mat):
    obj.data.materials.append(mat)
    return obj


def bevel_cube(name, location, dimensions, mat, bevel=0.12):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Soft rounded edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 4
        modifier.limit_method = "ANGLE"
    apply_material(obj, mat)
    return obj


def uv_sphere(name, location, scale, mat, segments=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    bpy.ops.object.shade_smooth()
    return obj


def cylinder(name, location, radius, depth, mat, rotation=(0.0, 0.0, 0.0), vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    apply_material(obj, mat)
    bevel = obj.modifiers.new("Edge softness", "BEVEL")
    bevel.width = min(radius * 0.22, 0.08)
    bevel.segments = 3
    bpy.ops.object.shade_smooth()
    return obj


def torus(name, location, major, minor, mat, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=36, minor_segments=10, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    apply_material(obj, mat)
    bpy.ops.object.shade_smooth()
    return obj


def parent(obj, root):
    obj.parent = root
    return obj


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def cylinder_between(name, start, end, radius, mat, vertices=20):
    start = Vector(start)
    end = Vector(end)
    direction = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=(start + end) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    apply_material(obj, mat)
    bevel = obj.modifiers.new("Soft tactical edges", "BEVEL")
    bevel.width = min(radius * 0.2, 0.06)
    bevel.segments = 3
    bpy.ops.object.shade_smooth()
    return obj


def cone(name, location, radius, depth, mat, vertices=20):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius * 0.72, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    apply_material(obj, mat)
    bpy.ops.object.shade_smooth()
    return obj


def build_model():
    clear_scene()
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root = bpy.context.object
    root.name = "MindGlow_Companion"
    root.empty_display_size = 0.25

    shell = material("MindGlow Shell", (0.035, 0.55, 0.66), metallic=0.42, roughness=0.26)
    shell_dark = material("MindGlow Shell Shadow", (0.018, 0.16, 0.25), metallic=0.55, roughness=0.22)
    lavender = material("MindGlow Head", (0.46, 0.42, 0.92), metallic=0.2, roughness=0.3)
    visor = material("MindGlow Visor", (0.008, 0.018, 0.07), metallic=0.65, roughness=0.12)
    cyan = material("MindGlow Cyan Light", (0.03, 0.7, 0.82), metallic=0.15, roughness=0.18, emission=(0.02, 0.85, 1.0), emission_strength=5.0)
    magenta = material("MindGlow Magenta Light", (0.85, 0.06, 0.42), metallic=0.12, roughness=0.22, emission=(1.0, 0.03, 0.34), emission_strength=4.0)
    gold = material("MindGlow Energy Core", (1.0, 0.48, 0.07), metallic=0.25, roughness=0.18, emission=(1.0, 0.2, 0.02), emission_strength=5.5)
    white = material("MindGlow Eye Light", (0.65, 0.9, 1.0), metallic=0.05, roughness=0.12, emission=(0.35, 0.8, 1.0), emission_strength=6.0)

    body = bevel_cube("Body", (0.0, 0.0, 0.9), (1.55, 1.28, 1.72), shell, 0.24)
    parent(body, root)
    lower = bevel_cube("Lower_Shadow_Panel", (0.0, -0.015, 0.42), (1.18, 1.34, 0.28), shell_dark, 0.1)
    parent(lower, root)

    head = uv_sphere("Head", (0.0, 0.0, 1.98), (0.66, 0.62, 0.55), lavender)
    parent(head, root)
    visor_panel = bevel_cube("Visor", (0.0, -0.555, 1.98), (0.78, 0.06, 0.22), visor, 0.06)
    parent(visor_panel, root)
    for x in (-0.2, 0.2):
        eye = uv_sphere("Eye_L" if x < 0 else "Eye_R", (x, -0.595, 2.01), (0.075, 0.035, 0.055), white, 16, 10)
        parent(eye, root)

    for x in (-0.91, 0.91):
        arm = cylinder("Arm_L" if x < 0 else "Arm_R", (x, 0.0, 0.98), 0.14, 0.75, lavender, rotation=(0.0, math.radians(11 if x < 0 else -11), 0.0), vertices=16)
        parent(arm, root)
        hand = uv_sphere("Hand_L" if x < 0 else "Hand_R", (x * 1.02, 0.0, 0.58), (0.19, 0.18, 0.16), shell_dark, 20, 12)
        parent(hand, root)

    collar = torus("Energy_Collar", (0.0, 0.0, 1.52), 0.53, 0.065, cyan)
    parent(collar, root)
    core_ring = torus("Core_Ring", (0.0, -0.66, 0.9), 0.27, 0.055, gold, rotation=(math.pi / 2, 0.0, 0.0))
    parent(core_ring, root)
    core = uv_sphere("Core", (0.0, -0.72, 0.9), (0.16, 0.07, 0.16), gold, 24, 16)
    parent(core, root)

    antenna = cylinder("Antenna", (0.0, 0.0, 2.58), 0.045, 0.32, shell_dark, vertices=12)
    parent(antenna, root)
    beacon = uv_sphere("Beacon", (0.0, 0.0, 2.78), (0.11, 0.11, 0.11), magenta, 20, 12)
    parent(beacon, root)

    # A small emissive mark gives the model a readable silhouette in the web scene.
    badge = bevel_cube("Chest_Badge", (0.0, -0.67, 1.17), (0.34, 0.045, 0.22), cyan, 0.06)
    parent(badge, root)

    # Gentle idle animation: the core pulses while the web app remains free to rotate the model.
    core.keyframe_insert(data_path="scale", frame=1)
    core.scale = (1.18, 1.18, 1.18)
    core.keyframe_insert(data_path="scale", frame=18)
    core.scale = (1.0, 1.0, 1.0)
    core.keyframe_insert(data_path="scale", frame=36)
    if core.animation_data and core.animation_data.action:
        for fcurve in core.animation_data.action.fcurves:
            for point in fcurve.keyframe_points:
                point.interpolation = "BEZIER"

    # Ground and studio lights stay in the .blend for editing, but are not exported to the web asset.
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0.0, 0.0, 0.0))
    floor = bpy.context.object
    floor.name = "Studio_Ground_Not_Exported"
    floor.data.materials.append(shell_dark)

    bpy.ops.object.light_add(type="AREA", location=(4.0, -6.0, 5.0))
    key = bpy.context.object
    key.name = "Key_Light"
    key.data.energy = 700
    key.data.shape = "DISK"
    key.data.size = 4.0
    key.rotation_euler = (math.radians(28), 0.0, math.radians(32))

    bpy.ops.object.light_add(type="AREA", location=(-4.0, -3.0, 1.0))
    fill = bpy.context.object
    fill.name = "Fill_Light"
    fill.data.energy = 420
    fill.data.color = (0.15, 0.75, 1.0)
    fill.data.size = 3.0
    fill.rotation_euler = (math.radians(70), 0.0, math.radians(-125))

    bpy.ops.object.camera_add(location=(5.8, -6.8, 3.4))
    camera = bpy.context.object
    camera.name = "Preview_Camera"
    camera.data.lens = 52
    direction = Vector((0.0, 1.15, 0.0)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera

    bpy.context.scene.render.engine = "BLENDER_EEVEE_NEXT"
    bpy.context.scene.render.resolution_x = 640
    bpy.context.scene.render.resolution_y = 640
    bpy.context.scene.render.resolution_percentage = 100
    bpy.context.scene.render.film_transparent = False
    bpy.context.scene.world.color = (0.004, 0.008, 0.02)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0

    # Select only the character collection content for GLB export.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.name not in {"Studio_Ground_Not_Exported", "Key_Light", "Fill_Light", "Preview_Camera", "MindGlow_Companion"}:
            obj.select_set(True)
    root.select_set(True)
    bpy.context.view_layer.objects.active = root

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_materials="EXPORT",
        export_apply=True,
    )
    print(f"Created {BLEND_PATH}")
    print(f"Created {GLB_PATH}")


def build_soldier_model():
    """Build an original tactical forest character inspired by the supplied reference."""
    clear_scene()
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root = bpy.context.object
    root.name = "MindGlow_Soldier"
    root.empty_display_size = 0.25

    uniform = material("Field Uniform", (0.22, 0.27, 0.16), metallic=0.05, roughness=0.83)
    uniform_dark = material("Uniform Shadow", (0.1, 0.12, 0.07), metallic=0.08, roughness=0.88)
    vest = material("Tactical Vest", (0.16, 0.18, 0.13), metallic=0.12, roughness=0.74)
    vest_high = material("Vest Webbing", (0.28, 0.29, 0.2), metallic=0.05, roughness=0.7)
    helmet = material("Combat Helmet", (0.3, 0.34, 0.21), metallic=0.18, roughness=0.62)
    helmet_dark = material("Helmet Shadow", (0.1, 0.12, 0.075), metallic=0.25, roughness=0.56)
    boots = material("Combat Boots", (0.055, 0.045, 0.032), metallic=0.05, roughness=0.9)
    skin = material("Skin", (0.31, 0.2, 0.14), metallic=0.0, roughness=0.9)
    metal = material("Weapon Metal", (0.045, 0.055, 0.05), metallic=0.75, roughness=0.3)
    glass = material("Optic Glass", (0.02, 0.07, 0.045), metallic=0.25, roughness=0.12, emission=(0.03, 0.2, 0.08), emission_strength=0.55)
    forest_ground = material("Forest Ground", (0.075, 0.105, 0.045), roughness=0.98)
    bark = material("Tree Bark", (0.12, 0.07, 0.035), roughness=0.98)
    foliage = material("Forest Foliage", (0.055, 0.19, 0.065), roughness=0.95)
    foliage_light = material("Forest Foliage Light", (0.17, 0.32, 0.075), roughness=0.9)

    def add(obj):
        return parent(obj, root)

    # Torso, armor and load-bearing equipment.
    add(bevel_cube("Uniform_Torso", (0.0, 0.0, 1.82), (1.15, 0.68, 1.5), uniform, 0.15))
    add(bevel_cube("Armor_Front_Plate", (0.0, -0.38, 1.92), (1.08, 0.12, 1.12), vest, 0.09))
    add(bevel_cube("Armor_Back_Plate", (0.0, 0.38, 1.92), (1.05, 0.1, 1.08), vest, 0.08))
    add(bevel_cube("Waist_Belt", (0.0, -0.01, 1.23), (1.28, 0.76, 0.19), vest_high, 0.05))
    for x in (-0.37, 0.0, 0.37):
        add(bevel_cube("Front_Pouch", (x, -0.47, 1.62), (0.27, 0.16, 0.35), uniform_dark, 0.045))
        add(bevel_cube("Pouch_Flap", (x, -0.56, 1.8), (0.25, 0.035, 0.08), vest_high, 0.02))
    add(bevel_cube("Backpack", (0.0, 0.53, 2.05), (0.78, 0.34, 1.12), uniform_dark, 0.13))
    add(bevel_cube("Backpack_Top", (0.0, 0.53, 2.67), (0.6, 0.3, 0.18), vest, 0.06))
    add(bevel_cube("Radio_Pouch", (0.62, 0.2, 2.25), (0.22, 0.25, 0.43), vest, 0.04))
    add(cylinder("Radio_Antenna", (0.62, 0.2, 2.58), 0.025, 0.35, metal, vertices=10))

    # Helmet, neck and head silhouette.
    add(cylinder("Neck", (0.0, 0.0, 2.7), 0.2, 0.28, uniform_dark, vertices=20))
    add(uv_sphere("Head", (0.0, -0.01, 3.03), (0.34, 0.31, 0.39), skin, 28, 18))
    add(uv_sphere("Helmet_Shell", (0.0, 0.02, 3.31), (0.47, 0.42, 0.3), helmet, 32, 18))
    add(bevel_cube("Helmet_Brim", (0.0, -0.25, 3.15), (0.82, 0.55, 0.1), helmet_dark, 0.045))
    add(bevel_cube("Helmet_Cover", (0.0, 0.35, 3.3), (0.54, 0.12, 0.12), helmet_dark, 0.04))
    add(bevel_cube("Helmet_Mount", (0.0, -0.28, 3.37), (0.19, 0.08, 0.14), metal, 0.025))

    # Arms with articulated sleeves, gloves and shoulder armor.
    for side in (-1, 1):
        label = "L" if side < 0 else "R"
        add(bevel_cube(f"Shoulder_Armor_{label}", (side * 0.68, 0.0, 2.36), (0.34, 0.7, 0.27), vest, 0.08))
        add(cylinder_between(f"Upper_Arm_{label}", (side * 0.73, 0.0, 2.27), (side * 0.84, -0.02, 1.8), 0.19, uniform))
        add(bevel_cube(f"Elbow_Pad_{label}", (side * 0.84, -0.03, 1.74), (0.25, 0.27, 0.2), vest, 0.05))
        add(cylinder_between(f"Forearm_{label}", (side * 0.84, -0.02, 1.66), (side * 0.84, -0.2, 1.27), 0.16, uniform_dark))
        add(uv_sphere(f"Glove_{label}", (side * 0.84, -0.2, 1.17), (0.2, 0.17, 0.18), uniform_dark, 20, 12))

    # Legs, knee pads and boots.
    for side in (-1, 1):
        label = "L" if side < 0 else "R"
        hip = (side * 0.32, 0.0, 1.12)
        knee = (side * 0.34, -0.02, 0.57)
        ankle = (side * 0.36, -0.07, 0.2)
        add(cylinder_between(f"Thigh_{label}", hip, knee, 0.24, uniform))
        add(bevel_cube(f"Knee_Pad_{label}", (side * 0.34, -0.13, 0.55), (0.3, 0.22, 0.24), vest, 0.06))
        add(cylinder_between(f"Shin_{label}", (side * 0.34, -0.02, 0.45), ankle, 0.18, uniform_dark))
        add(bevel_cube(f"Boot_{label}", (side * 0.36, -0.17, 0.12), (0.43, 0.82, 0.25), boots, 0.08))
        add(bevel_cube(f"Boot_Sole_{label}", (side * 0.36, -0.2, 0.03), (0.45, 0.85, 0.08), metal, 0.025))

    # A compact rifle is carried diagonally across the back.
    add(cylinder_between("Rifle_Body", (0.48, 0.57, 1.38), (-0.24, 0.62, 2.42), 0.09, metal))
    add(bevel_cube("Rifle_Stock", (0.54, 0.58, 1.34), (0.18, 0.18, 0.42), uniform_dark, 0.035))
    add(cylinder_between("Rifle_Barrel", (-0.22, 0.62, 2.4), (-0.3, 0.62, 3.03), 0.035, metal, vertices=12))
    add(uv_sphere("Rifle_Optic", (-0.22, 0.55, 2.44), (0.08, 0.08, 0.08), glass, 16, 10))

    # Forest showcase remains in the .blend only; the GLB exports the soldier alone.
    bpy.ops.mesh.primitive_plane_add(size=18, location=(0.0, 0.0, -0.02))
    ground = bpy.context.object
    ground.name = "Forest_Ground_Not_Exported"
    ground.data.materials.append(forest_ground)
    for x, y, height, radius in [(-4.4, 2.0, 5.4, 0.28), (4.6, 1.0, 4.6, 0.24), (-3.8, -3.0, 3.8, 0.22), (4.2, -3.0, 5.8, 0.3), (0.0, 5.0, 4.6, 0.25)]:
        cylinder(f"Forest_Trunk_{x}_{y}", (x, y, height / 2), radius, height, bark, vertices=12)
        cone(f"Forest_Canopy_{x}_{y}", (x, y, height + 0.75), radius * 3.8, 2.8, foliage, vertices=12)
        cone(f"Forest_Canopy_Light_{x}_{y}", (x, y - 0.12, height + 1.85), radius * 3.0, 2.35, foliage_light, vertices=12)

    bpy.ops.object.light_add(type="POINT", location=(4.0, 1.5, 6.5))
    key = bpy.context.object
    key.name = "Forest_Sun_Key"
    key.data.energy = 850
    key.data.color = (1.0, 0.78, 0.52)
    key.data.shadow_soft_size = 3.0
    bpy.ops.object.light_add(type="POINT", location=(-4.0, 2.5, 4.0))
    fill = bpy.context.object
    fill.name = "Forest_Sky_Fill"
    fill.data.energy = 700
    fill.data.color = (0.35, 0.55, 0.8)
    fill.data.shadow_soft_size = 4.0
    bpy.ops.object.light_add(type="SUN", location=(0.0, 0.0, 7.0))
    sun = bpy.context.object
    sun.name = "Forest_Daylight"
    sun.data.energy = 2.2
    sun.data.angle = math.radians(18)
    sun.rotation_euler = (math.radians(28), math.radians(-22), math.radians(-28))

    bpy.ops.object.camera_add(location=(3.8, 7.8, 3.15))
    camera = bpy.context.object
    camera.name = "Preview_Camera"
    camera.data.lens = 58
    direction = Vector((0.0, 0.0, 1.62)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    bpy.context.scene.render.engine = "BLENDER_EEVEE_NEXT"
    bpy.context.scene.render.resolution_x = 640
    bpy.context.scene.render.resolution_y = 640
    bpy.context.scene.render.resolution_percentage = 100
    bpy.context.scene.world.color = (0.08, 0.12, 0.06)
    bpy.context.scene.world.use_nodes = True
    world_bg = bpy.context.scene.world.node_tree.nodes.get("Background")
    if world_bg:
        world_bg.inputs["Color"].default_value = (0.08, 0.12, 0.06, 1.0)
        world_bg.inputs["Strength"].default_value = 0.35
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0

    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in root.children_recursive:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format="GLB", use_selection=True, export_animations=True, export_materials="EXPORT", export_apply=True)
    print(f"Created soldier model {BLEND_PATH}")
    print(f"Created soldier export {GLB_PATH}")


if __name__ == "__main__":
    build_soldier_model()

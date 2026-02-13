-- ==========================================
-- БАЗОВЫЕ ТАБЛИЦЫ: АККАУНТЫ И РОЛИ
-- ==========================================

CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    settings JSONB DEFAULT '{}',
    status INTEGER DEFAULT 1, -- 0-inactive, 1-active, 2-suspended
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE accounts IS 'Организации/компании - мультитенантность';

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE roles IS 'Роли: super_admin, admin, hr_manager, project_manager, foreman, supplier_manager, warehouse_keeper, accountant, inspector, worker, supplier, contractor, observer, analyst';

-- Вставка базовых ролей
INSERT INTO roles (name, code, description, permissions) VALUES
('Супер Администратор', 'super_admin', 'Полный доступ ко всем модулям', '{"all": "full"}'),
('Администратор', 'admin', 'Управление системой и пользователями', '{"all": "full", "system": "manage"}'),
('HR Менеджер', 'hr_manager', 'Управление персоналом', '{"hr": "full", "communications": "full", "calendar": "full"}'),
('Менеджер проектов', 'project_manager', 'Управление проектами', '{"projects": "full", "tasks": "full", "reports": "view", "budget": "view"}'),
('Прораб', 'foreman', 'Управление объектом', '{"tasks": "full", "inspections": "full", "materials": "request", "workers": "manage"}'),
('Снабженец', 'supplier_manager', 'Управление снабжением', '{"materials": "full", "suppliers": "full", "orders": "full"}'),
('Кладовщик', 'warehouse_keeper', 'Управление складом', '{"warehouse": "full", "materials": "view", "receiving": "full"}'),
('Бухгалтер', 'accountant', 'Финансовый учёт', '{"finance": "full", "payments": "full", "acts": "full", "budget": "full"}'),
('Инспектор', 'inspector', 'Контроль качества', '{"inspections": "full", "defects": "full", "quality": "full"}'),
('Рабочий', 'worker', 'Выполнение задач', '{"tasks": "own", "materials": "view"}'),
('Поставщик', 'supplier', 'Внешний поставщик', '{"orders": "own", "deliveries": "own"}'),
('Подрядчик', 'contractor', 'Внешний подрядчик', '{"tasks": "own", "acts": "own", "payments": "view"}'),
('Наблюдатель', 'observer', 'Только просмотр', '{"all": "view"}'),
('Аналитик', 'analyst', 'Отчёты и аналитика', '{"reports": "full", "analytics": "full", "all": "view"}');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    
    -- Статусы
    availability INTEGER DEFAULT 1, -- 0-offline, 1-online, 2-busy, 3-vacation, 4-sick
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Авторизация
    password_digest VARCHAR(255),
    confirmed_at TIMESTAMP,
    last_sign_in_at TIMESTAMP,
    current_sign_in_at TIMESTAMP,
    sign_in_count INTEGER DEFAULT 0,
    
    -- Дополнительная информация
    position VARCHAR(255),
    hire_date DATE,
    birth_date DATE,
    passport_data JSONB,
    address TEXT,
    
    -- Настройки
    settings JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_account ON users(account_id);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(account_id, is_active);

-- ==========================================
-- КОМАНДЫ
-- ==========================================

CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_lead_id INTEGER REFERENCES users(id),
    status INTEGER DEFAULT 1, -- 0-inactive, 1-active, 2-disbanded
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teams_account ON teams(account_id);
CREATE INDEX idx_teams_lead ON teams(team_lead_id);

CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_in_team VARCHAR(100), -- lead, member, assistant
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- ==========================================
-- ПРОЕКТЫ И ОБЪЕКТЫ
-- ==========================================

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    description TEXT,
    
    -- Руководство
    project_manager_id INTEGER REFERENCES users(id),
    client_name VARCHAR(255),
    client_contact JSONB,
    
    -- Сроки и бюджет
    start_date DATE,
    planned_end_date DATE,
    actual_end_date DATE,
    budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    
    -- Статус
    status INTEGER DEFAULT 0, -- 0-planning, 1-active, 2-paused, 3-completed, 4-cancelled
    priority INTEGER DEFAULT 2, -- 1-low, 2-medium, 3-high, 4-critical
    
    -- Дополнительно
    address TEXT,
    coordinates JSONB,
    documents JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_projects_account ON projects(account_id);
CREATE INDEX idx_projects_manager ON projects(project_manager_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_code ON projects(code);

CREATE TABLE construction_sites (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    site_type VARCHAR(100), -- residential, commercial, industrial
    
    -- Локация
    address TEXT NOT NULL,
    coordinates JSONB,
    area_size DECIMAL(10,2),
    
    -- Ответственные
    foreman_id INTEGER REFERENCES users(id),
    
    -- Статус
    status INTEGER DEFAULT 0, -- 0-preparing, 1-in_progress, 2-completed, 3-on_hold
    
    -- Даты
    start_date DATE,
    planned_end_date DATE,
    actual_end_date DATE,
    
    -- Дополнительно
    description TEXT,
    photos JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_sites_project ON construction_sites(project_id);
CREATE INDEX idx_sites_foreman ON construction_sites(foreman_id);
CREATE INDEX idx_sites_status ON construction_sites(status);

-- ==========================================
-- ПРИВЯЗКА КОМАНД К ПРОЕКТАМ
-- ==========================================

CREATE TABLE project_teams (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    construction_site_id INTEGER REFERENCES construction_sites(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, team_id, construction_site_id)
);

CREATE INDEX idx_project_teams_project ON project_teams(project_id);
CREATE INDEX idx_project_teams_team ON project_teams(team_id);
CREATE INDEX idx_project_teams_site ON project_teams(construction_site_id);

CREATE TABLE user_project_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    construction_site_id INTEGER REFERENCES construction_sites(id),
    team_id INTEGER REFERENCES teams(id),
    role_on_project VARCHAR(100),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP,
    hourly_rate DECIMAL(10,2),
    daily_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_assignments_user ON user_project_assignments(user_id);
CREATE INDEX idx_user_assignments_project ON user_project_assignments(project_id);
CREATE INDEX idx_user_assignments_site ON user_project_assignments(construction_site_id);
CREATE INDEX idx_user_assignments_team ON user_project_assignments(team_id);

-- ==========================================
-- ШАБЛОНЫ РАБОТ И СТАНДАРТЫ
-- ==========================================

CREATE TABLE work_templates (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    description TEXT,
    unit VARCHAR(50), -- м2, м3, шт, п.м
    estimated_duration INTEGER, -- в часах
    estimated_cost DECIMAL(10,2),
    complexity_level INTEGER, -- 1-5
    required_skills JSONB DEFAULT '[]',
    safety_requirements JSONB DEFAULT '[]',
    quality_standards JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_templates_account ON work_templates(account_id);
CREATE INDEX idx_work_templates_category ON work_templates(category);

CREATE TABLE work_sequences (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    work_type VARCHAR(100), -- foundation, walls, roofing, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE work_sequence_steps (
    id SERIAL PRIMARY KEY,
    work_sequence_id INTEGER REFERENCES work_sequences(id) ON DELETE CASCADE,
    work_template_id INTEGER REFERENCES work_templates(id),
    step_order INTEGER NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    dependencies JSONB DEFAULT '[]', -- ID предыдущих шагов
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quality_standards (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    requirements JSONB DEFAULT '[]',
    acceptance_criteria JSONB DEFAULT '[]',
    reference_documents JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ЗАДАЧИ (ПОЛНЫЙ ЦИКЛ)
-- ==========================================

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    construction_site_id INTEGER REFERENCES construction_sites(id),
    parent_task_id INTEGER REFERENCES tasks(id),
    work_template_id INTEGER REFERENCES work_templates(id),
    
    -- Основная информация
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100), -- construction, inspection, delivery, etc.
    
    -- Назначение
    assigned_to_user_id INTEGER REFERENCES users(id),
    assigned_to_team_id INTEGER REFERENCES teams(id),
    created_by_user_id INTEGER REFERENCES users(id),
    
    -- Приоритет и статус
    priority INTEGER DEFAULT 2, -- 1-low, 2-medium, 3-high, 4-critical
    status INTEGER DEFAULT 0, -- 0-new, 1-assigned, 2-in_progress, 3-review, 4-completed, 5-cancelled
    
    -- Временные рамки
    start_date DATE,
    due_date DATE,
    actual_start_date TIMESTAMP,
    actual_end_date TIMESTAMP,
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    
    -- Локация
    location_description TEXT,
    coordinates JSONB,
    
    -- Прогресс
    progress_percentage INTEGER DEFAULT 0,
    completion_notes TEXT,
    
    -- Связи
    dependencies JSONB DEFAULT '[]', -- ID задач, которые должны быть выполнены до этой
    blocked_by JSONB DEFAULT '[]',
    
    -- Дополнительно
    attachments JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_tasks_account ON tasks(account_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_site ON tasks(construction_site_id);
CREATE INDEX idx_tasks_assigned_user ON tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_assigned_team ON tasks(assigned_to_team_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

CREATE TABLE task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    comment_text TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_time_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_status_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    changed_by_user_id INTEGER REFERENCES users(id),
    old_status INTEGER,
    new_status INTEGER,
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- КАТАЛОГ МАТЕРИАЛОВ
-- ==========================================

CREATE TABLE material_categories (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    parent_category_id INTEGER REFERENCES material_categories(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES material_categories(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    description TEXT,
    
    -- Измерения
    unit VARCHAR(50), -- шт, м2, м3, кг, л
    
    -- Характеристики
    manufacturer VARCHAR(255),
    specifications JSONB DEFAULT '{}',
    
    -- Цены
    base_price DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'RUB',
    
    -- Склад
    min_stock_level DECIMAL(10,2),
    max_stock_level DECIMAL(10,2),
    reorder_point DECIMAL(10,2),
    
    -- Дополнительно
    photos JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    barcode VARCHAR(100),
    qr_code VARCHAR(255),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_materials_account ON materials(account_id);
CREATE INDEX idx_materials_category ON materials(category_id);
CREATE INDEX idx_materials_code ON materials(code);

CREATE TABLE material_alternatives (
    id SERIAL PRIMARY KEY,
    material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
    alternative_material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ПОСТАВЩИКИ
-- ==========================================

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    inn VARCHAR(50),
    kpp VARCHAR(50),
    
    -- Контакты
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Адреса
    legal_address TEXT,
    warehouse_address TEXT,
    
    -- Условия работы
    payment_terms VARCHAR(100), -- prepayment, postpayment, 50/50
    delivery_time_days INTEGER,
    min_order_amount DECIMAL(10,2),
    
    -- Рейтинг
    rating DECIMAL(3,2), -- 0.00 - 5.00
    reliability_score INTEGER, -- 0-100
    
    -- Статус
    status INTEGER DEFAULT 1, -- 0-inactive, 1-active, 2-blocked
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Дополнительно
    notes TEXT,
    documents JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_suppliers_account ON suppliers(account_id);
CREATE INDEX idx_suppliers_status ON suppliers(status);

CREATE TABLE supplier_materials (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
    supplier_code VARCHAR(100),
    price DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'RUB',
    min_order_quantity DECIMAL(10,2),
    delivery_time_days INTEGER,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(supplier_id, material_id)
);

CREATE TABLE supplier_price_history (
    id SERIAL PRIMARY KEY,
    supplier_material_id INTEGER REFERENCES supplier_materials(id) ON DELETE CASCADE,
    price DECIMAL(10,2),
    valid_from DATE NOT NULL,
    valid_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ЗАКАЗЫ ПОСТАВЩИКАМ
-- ==========================================

CREATE TABLE supplier_orders (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    
    order_number VARCHAR(100) UNIQUE NOT NULL,
    order_date DATE NOT NULL,
    
    -- Ответственные
    created_by_user_id INTEGER REFERENCES users(id),
    approved_by_user_id INTEGER REFERENCES users(id),
    
    -- Статус
    status INTEGER DEFAULT 0, -- 0-draft, 1-sent, 2-confirmed, 3-partially_delivered, 4-delivered, 5-cancelled
    
    -- Сроки
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Суммы
    subtotal DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    delivery_cost DECIMAL(15,2),
    total_amount DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'RUB',
    
    -- Доставка
    delivery_address TEXT,
    delivery_contact VARCHAR(255),
    delivery_notes TEXT,
    
    -- Оплата
    payment_terms VARCHAR(100),
    payment_status INTEGER DEFAULT 0, -- 0-unpaid, 1-partial, 2-paid
    
    notes TEXT,
    documents JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_supplier_orders_account ON supplier_orders(account_id);
CREATE INDEX idx_supplier_orders_project ON supplier_orders(project_id);
CREATE INDEX idx_supplier_orders_supplier ON supplier_orders(supplier_id);
CREATE INDEX idx_supplier_orders_status ON supplier_orders(status);
CREATE INDEX idx_supplier_orders_number ON supplier_orders(order_number);

CREATE TABLE supplier_order_items (
    id SERIAL PRIMARY KEY,
    supplier_order_id INTEGER REFERENCES supplier_orders(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id),
    
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    
    delivered_quantity DECIMAL(10,2) DEFAULT 0,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- МАТЕРИАЛЫ И СНАБЖЕНИЕ (ЗАЯВКИ)
-- ==========================================

CREATE TABLE material_requests (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    task_id INTEGER REFERENCES tasks(id),
    
    request_number VARCHAR(100) UNIQUE NOT NULL,
    
    -- Кто запросил
    requested_by_user_id INTEGER REFERENCES users(id),
    approved_by_user_id INTEGER REFERENCES users(id),
    
    -- Статус
    status INTEGER DEFAULT 0, -- 0-new, 1-review, 2-approved, 3-ordered, 4-partially_fulfilled, 5-fulfilled, 6-rejected
    priority INTEGER DEFAULT 2,
    
    -- Даты
    request_date DATE NOT NULL,
    needed_by_date DATE,
    approved_date DATE,
    
    purpose TEXT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_material_requests_account ON material_requests(account_id);
CREATE INDEX idx_material_requests_project ON material_requests(project_id);
CREATE INDEX idx_material_requests_site ON material_requests(construction_site_id);
CREATE INDEX idx_material_requests_status ON material_requests(status);

CREATE TABLE material_request_items (
    id SERIAL PRIMARY KEY,
    material_request_id INTEGER REFERENCES material_requests(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id),
    
    requested_quantity DECIMAL(10,2) NOT NULL,
    approved_quantity DECIMAL(10,2),
    fulfilled_quantity DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(50),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- СКЛАДСКОЙ УЧЁТ
-- ==========================================

CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    construction_site_id INTEGER REFERENCES construction_sites(id),
    
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    warehouse_type VARCHAR(100), -- main, site, mobile
    
    address TEXT,
    coordinates JSONB,
    
    -- Ответственный
    warehouse_keeper_id INTEGER REFERENCES users(id),
    
    capacity DECIMAL(10,2),
    area_size DECIMAL(10,2),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warehouses_account ON warehouses(account_id);
CREATE INDEX idx_warehouses_site ON warehouses(construction_site_id);

CREATE TABLE warehouse_stock (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
    
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(10,2) DEFAULT 0,
    available_quantity DECIMAL(10,2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    
    location VARCHAR(100), -- стеллаж, полка
    batch_number VARCHAR(100),
    
    last_inventory_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_id, material_id, batch_number)
);

CREATE INDEX idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id);
CREATE INDEX idx_warehouse_stock_material ON warehouse_stock(material_id);

CREATE TABLE warehouse_movements (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES warehouses(id),
    material_id INTEGER REFERENCES materials(id),
    
    movement_type VARCHAR(50), -- receipt, issue, transfer, adjustment, return
    
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50),
    
    -- Источник/назначение
    from_warehouse_id INTEGER REFERENCES warehouses(id),
    to_warehouse_id INTEGER REFERENCES warehouses(id),
    supplier_order_id INTEGER REFERENCES supplier_orders(id),
    material_request_id INTEGER REFERENCES material_requests(id),
    task_id INTEGER REFERENCES tasks(id),
    
    -- Ответственные
    performed_by_user_id INTEGER REFERENCES users(id),
    received_by_user_id INTEGER REFERENCES users(id),
    
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    batch_number VARCHAR(100),
    notes TEXT,
    documents JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warehouse_movements_warehouse ON warehouse_movements(warehouse_id);
CREATE INDEX idx_warehouse_movements_material ON warehouse_movements(material_id);
CREATE INDEX idx_warehouse_movements_date ON warehouse_movements(movement_date);

CREATE TABLE inventory_checks (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    check_number VARCHAR(100) UNIQUE NOT NULL,
    
    check_date DATE NOT NULL,
    performed_by_user_id INTEGER REFERENCES users(id),
    
    status INTEGER DEFAULT 0, -- 0-in_progress, 1-completed, 2-approved
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_check_items (
    id SERIAL PRIMARY KEY,
    inventory_check_id INTEGER REFERENCES inventory_checks(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id),
    
    expected_quantity DECIMAL(10,2),
    actual_quantity DECIMAL(10,2),
    difference DECIMAL(10,2) GENERATED ALWAYS AS (actual_quantity - expected_quantity) STORED,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ПОДРЯДЧИКИ
-- ==========================================

CREATE TABLE contractors (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    inn VARCHAR(50),
    kpp VARCHAR(50),
    
    -- Контакты
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    
    -- Адрес
    legal_address TEXT,
    
    -- Специализация
    specialization JSONB DEFAULT '[]',
    
    -- Рейтинг
    rating DECIMAL(3,2),
    reliability_score INTEGER,
    
    -- Условия
    payment_terms VARCHAR(100),
    
    status INTEGER DEFAULT 1, -- 0-inactive, 1-active, 2-blocked
    is_verified BOOLEAN DEFAULT FALSE,
    
    notes TEXT,
    documents JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_contractors_account ON contractors(account_id);

CREATE TABLE contractor_assignments (
    id SERIAL PRIMARY KEY,
    contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    construction_site_id INTEGER REFERENCES construction_sites(id),
    
    work_type VARCHAR(255),
    contract_amount DECIMAL(15,2),
    
    start_date DATE,
    end_date DATE,
    
    status INTEGER DEFAULT 0, -- 0-planned, 1-active, 2-completed, 3-cancelled
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ИНСПЕКЦИИ И ДЕФЕКТЫ
-- ==========================================

CREATE TABLE inspections (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    task_id INTEGER REFERENCES tasks(id),
    quality_standard_id INTEGER REFERENCES quality_standards(id),
    
    inspection_number VARCHAR(100) UNIQUE NOT NULL,
    inspection_type VARCHAR(100), -- quality, safety, compliance, final
    
    -- Кто проводит
    inspector_id INTEGER REFERENCES users(id),
    
    -- Дата и время
    scheduled_date DATE,
    actual_date DATE,
    
    -- Результат
    status INTEGER DEFAULT 0, -- 0-scheduled, 1-in_progress, 2-completed, 3-failed, 4-passed
    result VARCHAR(50), -- passed, failed, conditional
    
    -- Описание
    inspection_area VARCHAR(255),
    description TEXT,
    findings TEXT,
    recommendations TEXT,
    
    -- Оценка
    score INTEGER, -- 0-100
    
    photos JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspections_account ON inspections(account_id);
CREATE INDEX idx_inspections_project ON inspections(project_id);
CREATE INDEX idx_inspections_site ON inspections(construction_site_id);
CREATE INDEX idx_inspections_inspector ON inspections(inspector_id);

CREATE TABLE inspection_checklist_templates (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    inspection_type VARCHAR(100),
    checklist_items JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inspection_checklist_results (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER REFERENCES inspections(id) ON DELETE CASCADE,
    checklist_template_id INTEGER REFERENCES inspection_checklist_templates(id),
    results JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE defects (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    task_id INTEGER REFERENCES tasks(id),
    inspection_id INTEGER REFERENCES inspections(id),
    
    defect_number VARCHAR(100) UNIQUE NOT NULL,
    
    -- Классификация
    defect_type VARCHAR(100), -- critical, major, minor
    category VARCHAR(100), -- structural, finishing, electrical, plumbing
    severity INTEGER, -- 1-5
    
    -- Описание
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_description TEXT,
    coordinates JSONB,
    
    -- Ответственные
    reported_by_user_id INTEGER REFERENCES users(id),
    assigned_to_user_id INTEGER REFERENCES users(id),
    verified_by_user_id INTEGER REFERENCES users(id),
    
    -- Статус
    status INTEGER DEFAULT 0, -- 0-new, 1-assigned, 2-in_progress, 3-fixed, 4-verified, 5-closed, 6-rejected
    
    -- Даты
    reported_date DATE NOT NULL,
    due_date DATE,
    fixed_date DATE,
    verified_date DATE,
    
    -- Исправление
    correction_description TEXT,
    correction_cost DECIMAL(10,2),
    
    photos JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_defects_account ON defects(account_id);
CREATE INDEX idx_defects_project ON defects(project_id);
CREATE INDEX idx_defects_site ON defects(construction_site_id);
CREATE INDEX idx_defects_status ON defects(status);

CREATE TABLE defect_templates (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    defect_type VARCHAR(100),
    category VARCHAR(100),
    title VARCHAR(255),
    description TEXT,
    severity INTEGER,
    typical_cost DECIMAL(10,2),
    fix_instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- АКТЫ И ПРИЁМКА РАБОТ
-- ==========================================

CREATE TABLE acts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    contractor_id INTEGER REFERENCES contractors(id),
    
    act_number VARCHAR(100) UNIQUE NOT NULL,
    act_type VARCHAR(100), -- work_completion, material_receipt, services
    
    act_date DATE NOT NULL,
    
    -- Суммы
    subtotal DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    total_amount DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'RUB',
    
    -- Статус
    status INTEGER DEFAULT 0, -- 0-draft, 1-submitted, 2-approved, 3-rejected, 4-paid
    
    -- Участники
    prepared_by_user_id INTEGER REFERENCES users(id),
    approved_by_user_id INTEGER REFERENCES users(id),
    
    description TEXT,
    notes TEXT,
    documents JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_acts_account ON acts(account_id);
CREATE INDEX idx_acts_project ON acts(project_id);
CREATE INDEX idx_acts_contractor ON acts(contractor_id);
CREATE INDEX idx_acts_status ON acts(status);

CREATE TABLE act_items (
    id SERIAL PRIMARY KEY,
    act_id INTEGER REFERENCES acts(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id),
    work_template_id INTEGER REFERENCES work_templates(id),
    
    description TEXT NOT NULL,
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ФИНАНСЫ: ПЛАТЕЖИ И ТРАНЗАКЦИИ
-- ==========================================

CREATE TABLE payment_accounts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(100), -- bank, cash, card
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'RUB',
    balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    payment_account_id INTEGER REFERENCES payment_accounts(id),
    project_id INTEGER REFERENCES projects(id),
    
    payment_number VARCHAR(100) UNIQUE NOT NULL,
    payment_type VARCHAR(100), -- income, expense
    category VARCHAR(100), -- salary, materials, services, taxes, other
    
    -- Контрагент
    counterparty_type VARCHAR(50), -- supplier, contractor, employee, client
    supplier_id INTEGER REFERENCES suppliers(id),
    contractor_id INTEGER REFERENCES contractors(id),
    user_id INTEGER REFERENCES users(id),
    
    -- Связи
    supplier_order_id INTEGER REFERENCES supplier_orders(id),
    act_id INTEGER REFERENCES acts(id),
    
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RUB',
    
    payment_date DATE NOT NULL,
    
    payment_method VARCHAR(100), -- cash, bank_transfer, card
    status INTEGER DEFAULT 0, -- 0-pending, 1-completed, 2-cancelled
    
    description TEXT,
    notes TEXT,
    documents JSONB DEFAULT '[]',
    
    created_by_user_id INTEGER REFERENCES users(id),
    approved_by_user_id INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_account ON payments(account_id);
CREATE INDEX idx_payments_project ON payments(project_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(status);

-- ==========================================
-- БЮДЖЕТИРОВАНИЕ
-- ==========================================

CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    
    budget_name VARCHAR(255) NOT NULL,
    budget_period VARCHAR(100), -- monthly, quarterly, annual, project
    
    start_date DATE,
    end_date DATE,
    
    total_budget DECIMAL(15,2) NOT NULL,
    allocated_amount DECIMAL(15,2) DEFAULT 0,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (total_budget - spent_amount) STORED,
    
    status INTEGER DEFAULT 1, -- 0-draft, 1-active, 2-closed
    
    created_by_user_id INTEGER REFERENCES users(id),
    approved_by_user_id INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budget_items (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER REFERENCES budgets(id) ON DELETE CASCADE,
    category VARCHAR(100), -- materials, labor, equipment, services
    subcategory VARCHAR(100),
    
    description TEXT,
    
    planned_amount DECIMAL(15,2) NOT NULL,
    allocated_amount DECIMAL(15,2) DEFAULT 0,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- БОНУСЫ И ВЫПЛАТЫ СОТРУДНИКАМ
-- ==========================================

CREATE TABLE bonuses (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id),
    
    bonus_type VARCHAR(100), -- performance, completion, quality, attendance
    
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RUB',
    
    period_start DATE,
    period_end DATE,
    
    description TEXT,
    approved_by_user_id INTEGER REFERENCES users(id),
    
    status INTEGER DEFAULT 0, -- 0-pending, 1-approved, 2-paid, 3-rejected
    
    payment_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bonuses_user ON bonuses(user_id);
CREATE INDEX idx_bonuses_project ON bonuses(project_id);

CREATE TABLE payroll (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    
    payroll_period VARCHAR(100), -- 2024-01
    
    base_salary DECIMAL(10,2),
    bonuses_amount DECIMAL(10,2) DEFAULT 0,
    deductions_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2),
    
    worked_hours DECIMAL(8,2),
    overtime_hours DECIMAL(8,2),
    
    status INTEGER DEFAULT 0, -- 0-calculated, 1-approved, 2-paid
    
    payment_date DATE,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payroll_user ON payroll(user_id);
CREATE INDEX idx_payroll_period ON payroll(payroll_period);

-- ==========================================
-- HR-ПРОЦЕССЫ
-- ==========================================

CREATE TABLE employee_documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100), -- contract, passport, diploma, certificate
    document_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    issuing_authority VARCHAR(255),
    file_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE time_off_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(100), -- vacation, sick_leave, personal, unpaid
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER,
    
    reason TEXT,
    
    status INTEGER DEFAULT 0, -- 0-pending, 1-approved, 2-rejected
    
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by_user_id INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    
    attendance_date DATE NOT NULL,
    
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    
    worked_hours DECIMAL(8,2),
    overtime_hours DECIMAL(8,2),
    
    status VARCHAR(50), -- present, absent, late, sick, vacation
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, attendance_date)
);

CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);

-- ==========================================
-- HSE (ОХРАНА ТРУДА И БЕЗОПАСНОСТЬ)
-- ==========================================

CREATE TABLE safety_incidents (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    
    incident_number VARCHAR(100) UNIQUE NOT NULL,
    incident_type VARCHAR(100), -- injury, near_miss, property_damage, environmental
    severity INTEGER, -- 1-5
    
    incident_date TIMESTAMP NOT NULL,
    location_description TEXT,
    
    description TEXT NOT NULL,
    
    -- Пострадавшие
    affected_users JSONB DEFAULT '[]',
    
    -- Причины
    root_cause TEXT,
    contributing_factors JSONB DEFAULT '[]',
    
    -- Действия
    immediate_actions TEXT,
    corrective_actions TEXT,
    preventive_actions TEXT,
    
    reported_by_user_id INTEGER REFERENCES users(id),
    investigated_by_user_id INTEGER REFERENCES users(id),
    
    status INTEGER DEFAULT 0, -- 0-reported, 1-investigating, 2-resolved, 3-closed
    
    photos JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE safety_trainings (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    training_name VARCHAR(255) NOT NULL,
    training_type VARCHAR(100), -- induction, fire_safety, work_at_height, electrical
    description TEXT,
    duration_hours INTEGER,
    validity_months INTEGER,
    is_mandatory BOOLEAN DEFAULT TRUE,
    materials JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE safety_training_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    safety_training_id INTEGER REFERENCES safety_trainings(id),
    
    training_date DATE NOT NULL,
    trainer_id INTEGER REFERENCES users(id),
    
    expiry_date DATE,
    
    score INTEGER,
    passed BOOLEAN,
    
    certificate_number VARCHAR(100),
    certificate_url VARCHAR(500),
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_training_records_user ON safety_training_records(user_id);
CREATE INDEX idx_training_records_expiry ON safety_training_records(expiry_date);

-- ==========================================
-- КАЛЕНДАРЬ И ПЛАНИРОВАНИЕ
-- ==========================================

CREATE TABLE calendar_events (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    task_id INTEGER REFERENCES tasks(id),
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    event_type VARCHAR(100), -- meeting, deadline, milestone, inspection, delivery
    
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP,
    
    is_all_day BOOLEAN DEFAULT FALSE,
    
    location VARCHAR(255),
    
    -- Участники
    organizer_id INTEGER REFERENCES users(id),
    participants JSONB DEFAULT '[]', -- user IDs
    
    -- Напоминания
    reminders JSONB DEFAULT '[]',
    
    status VARCHAR(50), -- scheduled, completed, cancelled
    
    recurrence_rule VARCHAR(255), -- для повторяющихся событий
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_events_start ON calendar_events(start_datetime);
CREATE INDEX idx_calendar_events_project ON calendar_events(project_id);

-- ==========================================
-- КОММУНИКАЦИИ И ЧАТЫ
-- ==========================================

CREATE TABLE chat_channels (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    channel_type VARCHAR(50), -- direct, group, project, announcement
    
    name VARCHAR(255),
    description TEXT,
    
    -- Связи
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    team_id INTEGER REFERENCES teams(id),
    
    created_by_user_id INTEGER REFERENCES users(id),
    
    is_private BOOLEAN DEFAULT FALSE,
    
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_channel_members (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(50), -- admin, member
    
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP,
    
    is_muted BOOLEAN DEFAULT FALSE,
    
    UNIQUE(channel_id, user_id)
);

CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    
    message_text TEXT,
    
    -- Типы сообщений
    message_type VARCHAR(50) DEFAULT 'text', -- text, image, file, system
    
    -- Вложения
    attachments JSONB DEFAULT '[]',
    
    -- Ответ на сообщение
    reply_to_message_id INTEGER REFERENCES chat_messages(id),
    
    -- Реакции
    reactions JSONB DEFAULT '{}',
    
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_channel ON chat_messages(channel_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    announcement_type VARCHAR(100), -- general, urgent, policy, event
    priority INTEGER DEFAULT 2,
    
    published_by_user_id INTEGER REFERENCES users(id),
    published_at TIMESTAMP,
    
    -- Кому видно
    target_audience JSONB DEFAULT '{}', -- all, specific_roles, specific_projects
    
    is_pinned BOOLEAN DEFAULT FALSE,
    
    attachments JSONB DEFAULT '[]',
    
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ОБОРУДОВАНИЕ
-- ==========================================

CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(100), -- vehicle, tool, machinery
    
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(100),
    
    purchase_date DATE,
    purchase_cost DECIMAL(10,2),
    
    -- Статус
    status INTEGER DEFAULT 1, -- 0-inactive, 1-available, 2-in_use, 3-maintenance, 4-broken
    
    -- Местоположение
    current_location VARCHAR(255),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    
    -- Ответственный
    assigned_to_user_id INTEGER REFERENCES users(id),
    
    -- Обслуживание
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    maintenance_interval_days INTEGER,
    
    notes TEXT,
    photos JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_equipment_account ON equipment(account_id);
CREATE INDEX idx_equipment_site ON equipment(construction_site_id);
CREATE INDEX idx_equipment_status ON equipment(status);

CREATE TABLE equipment_maintenance (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
    
    maintenance_type VARCHAR(100), -- scheduled, repair, inspection
    
    maintenance_date DATE NOT NULL,
    performed_by_user_id INTEGER REFERENCES users(id),
    
    description TEXT,
    cost DECIMAL(10,2),
    
    next_maintenance_date DATE,
    
    documents JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ДОКУМЕНТООБОРОТ
-- ==========================================

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    document_type VARCHAR(100), -- contract, permit, drawing, specification, report
    
    title VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    
    description TEXT,
    
    -- Связи
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    contractor_id INTEGER REFERENCES contractors(id),
    
    -- Версионирование
    version VARCHAR(50),
    parent_document_id INTEGER REFERENCES documents(id),
    
    -- Файлы
    file_url VARCHAR(500),
    file_size INTEGER,
    file_type VARCHAR(100),
    
    -- Даты
    issue_date DATE,
    expiry_date DATE,
    
    -- Статус
    status VARCHAR(50), -- draft, review, approved, archived
    
    -- Ответственные
    uploaded_by_user_id INTEGER REFERENCES users(id),
    approved_by_user_id INTEGER REFERENCES users(id),
    
    -- Права доступа
    access_level VARCHAR(50), -- public, private, restricted
    allowed_roles JSONB DEFAULT '[]',
    
    tags JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_documents_account ON documents(account_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- ==========================================
-- УВЕДОМЛЕНИЯ
-- ==========================================

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(100), -- task_assigned, payment_due, inspection_scheduled, etc.
    
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Связанная сущность
    entity_type VARCHAR(100), -- task, project, payment, inspection
    entity_id INTEGER,
    
    -- Каналы
    channels JSONB DEFAULT '["in_app"]', -- in_app, email, sms, push
    
    priority INTEGER DEFAULT 2, -- 1-low, 2-medium, 3-high
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    action_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ==========================================
-- ОТЧЁТЫ И АНАЛИТИКА
-- ==========================================

CREATE TABLE report_templates (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100), -- financial, progress, quality, safety, custom
    
    description TEXT,
    
    -- Конфигурация отчёта
    configuration JSONB DEFAULT '{}',
    
    -- Кто может использовать
    allowed_roles JSONB DEFAULT '[]',
    
    created_by_user_id INTEGER REFERENCES users(id),
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE generated_reports (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    report_template_id INTEGER REFERENCES report_templates(id),
    
    report_name VARCHAR(255),
    
    -- Период отчёта
    period_start DATE,
    period_end DATE,
    
    -- Связи
    project_id INTEGER REFERENCES projects(id),
    construction_site_id INTEGER REFERENCES construction_sites(id),
    
    -- Результаты
    report_data JSONB,
    file_url VARCHAR(500),
    
    generated_by_user_id INTEGER REFERENCES users(id),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_generated_reports_template ON generated_reports(report_template_id);
CREATE INDEX idx_generated_reports_project ON generated_reports(project_id);

-- ==========================================
-- СПРАВОЧНИКИ
-- ==========================================

CREATE TABLE dictionary_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO dictionary_types (code, name, is_system) VALUES
('work_categories', 'Категории работ', true),
('defect_types', 'Типы дефектов', true),
('payment_categories', 'Категории платежей', true),
('document_types', 'Типы документов', true),
('incident_types', 'Типы происшествий', true);

CREATE TABLE dictionary_values (
    id SERIAL PRIMARY KEY,
    dictionary_type_id INTEGER REFERENCES dictionary_types(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    parent_value_id INTEGER REFERENCES dictionary_values(id),
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(dictionary_type_id, account_id, code)
);

-- ==========================================
-- EVENT ENGINE (АУДИТ И ИСТОРИЯ)
-- ==========================================

CREATE TABLE event_log (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    event_type VARCHAR(100) NOT NULL, -- user_action, system_event, integration
    event_category VARCHAR(100), -- auth, crud, notification, integration
    
    -- Что произошло
    action VARCHAR(100) NOT NULL, -- create, update, delete, login, etc.
    entity_type VARCHAR(100), -- task, project, user, payment
    entity_id INTEGER,
    
    -- Кто совершил
    user_id INTEGER REFERENCES users(id),
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Детали
    description TEXT,
    changes JSONB, -- старые и новые значения
    metadata JSONB DEFAULT '{}',
    
    -- Связи
    project_id INTEGER REFERENCES projects(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_log_account ON event_log(account_id);
CREATE INDEX idx_event_log_user ON event_log(user_id);
CREATE INDEX idx_event_log_entity ON event_log(entity_type, entity_id);
CREATE INDEX idx_event_log_created ON event_log(created_at);

-- ==========================================
-- CRM-ПРОЦЕССЫ (КЛИЕНТЫ И ЛИДЫ)
-- ==========================================

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    client_type VARCHAR(50), -- individual, company
    
    -- Для физлиц
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    middle_name VARCHAR(255),
    
    -- Для юрлиц
    company_name VARCHAR(255),
    legal_name VARCHAR(255),
    inn VARCHAR(50),
    kpp VARCHAR(50),
    
    -- Контакты
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    
    -- Менеджер
    assigned_manager_id INTEGER REFERENCES users(id),
    
    -- Статус
    status VARCHAR(50), -- lead, prospect, active, inactive
    
    source VARCHAR(100), -- website, referral, advertising
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_account ON clients(account_id);
CREATE INDEX idx_clients_manager ON clients(assigned_manager_id);

CREATE TABLE client_interactions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    
    interaction_type VARCHAR(100), -- call, meeting, email, site_visit
    
    interaction_date TIMESTAMP NOT NULL,
    
    subject VARCHAR(255),
    notes TEXT,
    
    outcome VARCHAR(100), -- positive, neutral, negative
    
    next_action VARCHAR(255),
    next_action_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- СТРОИТЕЛЬНАЯ ВИКИ
-- ==========================================

CREATE TABLE wiki_pages (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    
    content TEXT,
    
    category VARCHAR(100), -- construction, materials, safety, procedures
    
    parent_page_id INTEGER REFERENCES wiki_pages(id),
    
    -- Версионирование
    version INTEGER DEFAULT 1,
    
    created_by_user_id INTEGER REFERENCES users(id),
    updated_by_user_id INTEGER REFERENCES users(id),
    
    -- Права доступа
    is_public BOOLEAN DEFAULT TRUE,
    allowed_roles JSONB DEFAULT '[]',
    
    tags JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    
    view_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wiki_pages_account ON wiki_pages(account_id);
CREATE INDEX idx_wiki_pages_category ON wiki_pages(category);

-- ==========================================
-- КАЛЬКУЛЯТОРЫ МАТЕРИАЛОВ
-- ==========================================

CREATE TABLE material_calculators (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    calculator_type VARCHAR(100), -- concrete, bricks, paint, tiles, etc.
    
    description TEXT,
    
    -- Формулы и параметры
    formula TEXT,
    parameters JSONB DEFAULT '[]',
    
    -- Связанные материалы
    output_materials JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE calculator_results (
    id SERIAL PRIMARY KEY,
    material_calculator_id INTEGER REFERENCES material_calculators(id),
    project_id INTEGER REFERENCES projects(id),
    task_id INTEGER REFERENCES tasks(id),
    
    input_parameters JSONB,
    output_results JSONB,
    
    calculated_by_user_id INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- БИБЛИОТЕКА ОБУЧАЮЩИХ МАТЕРИАЛОВ
-- ==========================================

CREATE TABLE training_materials (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    material_type VARCHAR(100), -- video, document, presentation, article
    
    content TEXT,
    file_url VARCHAR(500),
    
    category VARCHAR(100),
    difficulty_level VARCHAR(50), -- beginner, intermediate, advanced
    
    duration_minutes INTEGER,
    
    description TEXT,
    
    tags JSONB DEFAULT '[]',
    
    created_by_user_id INTEGER REFERENCES users(id),
    
    is_published BOOLEAN DEFAULT FALSE,
    
    view_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE training_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    training_material_id INTEGER REFERENCES training_materials(id) ON DELETE CASCADE,
    
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    progress_percentage INTEGER DEFAULT 0,
    
    last_position VARCHAR(100), -- для видео/документов
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, training_material_id)
);

-- ==========================================
-- СИСТЕМА ТЕСТИРОВАНИЯ ЗНАНИЙ
-- ==========================================

CREATE TABLE knowledge_tests (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    test_type VARCHAR(100), -- safety, technical, certification
    
    description TEXT,
    
    passing_score INTEGER, -- в процентах
    time_limit_minutes INTEGER,
    
    is_mandatory BOOLEAN DEFAULT FALSE,
    
    questions JSONB DEFAULT '[]',
    
    created_by_user_id INTEGER REFERENCES users(id),
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_attempts (
    id SERIAL PRIMARY KEY,
    knowledge_test_id INTEGER REFERENCES knowledge_tests(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    
    score INTEGER, -- в процентах
    passed BOOLEAN,
    
    answers JSONB,
    
    attempt_number INTEGER DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_attempts_user ON test_attempts(user_id);
CREATE INDEX idx_test_attempts_test ON test_attempts(knowledge_test_id);

-- ==========================================
-- КЛИЕНТСКИЙ ПОРТАЛ
-- ==========================================

CREATE TABLE client_portal_access (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    
    access_token VARCHAR(255) UNIQUE,
    
    can_view_progress BOOLEAN DEFAULT TRUE,
    can_view_photos BOOLEAN DEFAULT TRUE,
    can_view_documents BOOLEAN DEFAULT FALSE,
    can_view_financials BOOLEAN DEFAULT FALSE,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    expires_at TIMESTAMP,
    
    last_login_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- АВТОМАТИЗАЦИЯ (ПРАВИЛА И ТРИГГЕРЫ)
-- ==========================================

CREATE TABLE automation_rules (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    rule_type VARCHAR(100), -- task_auto_assign, notification, status_change
    
    -- Условие (когда срабатывает)
    trigger_event VARCHAR(100), -- task_created, defect_found, payment_overdue
    trigger_conditions JSONB DEFAULT '{}',
    
    -- Действие (что делать)
    actions JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT TRUE,
    
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP,
    
    created_by_user_id INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE automation_execution_log (
    id SERIAL PRIMARY KEY,
    automation_rule_id INTEGER REFERENCES automation_rules(id) ON DELETE CASCADE,
    
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    trigger_data JSONB,
    execution_result JSONB,
    
    success BOOLEAN,
    error_message TEXT
);

-- ==========================================
-- ГЕНЕРАТОР ДОКУМЕНТОВ
-- ==========================================

CREATE TABLE document_templates (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(100), -- contract, act, invoice, report
    
    description TEXT,
    
    -- Шаблон (HTML/PDF)
    template_content TEXT,
    
    -- Переменные для подстановки
    variables JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_by_user_id INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ПРАЙС-ЛИСТЫ И ЦЕНЫ
-- ==========================================

CREATE TABLE price_lists (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    list_type VARCHAR(100), -- materials, works, services
    
    valid_from DATE NOT NULL,
    valid_to DATE,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_by_user_id INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_list_items (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER REFERENCES price_lists(id) ON DELETE CASCADE,
    
    material_id INTEGER REFERENCES materials(id),
    work_template_id INTEGER REFERENCES work_templates(id),
    
    item_code VARCHAR(100),
    item_name VARCHAR(255),
    
    unit VARCHAR(50),
    price DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'RUB',
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ДАШБОРД И ВИДЖЕТЫ
-- ==========================================

CREATE TABLE dashboard_widgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    widget_type VARCHAR(100), -- tasks_summary, financials, progress, alerts
    
    title VARCHAR(255),
    
    configuration JSONB DEFAULT '{}',
    
    position INTEGER,
    size VARCHAR(50), -- small, medium, large
    
    is_visible BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ПЛАНИРОВЩИК РЕСУРСОВ
-- ==========================================

CREATE TABLE resource_allocations (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    resource_type VARCHAR(100), -- employee, equipment, material
    
    user_id INTEGER REFERENCES users(id),
    equipment_id INTEGER REFERENCES equipment(id),
    material_id INTEGER REFERENCES materials(id),
    
    project_id INTEGER REFERENCES projects(id),
    task_id INTEGER REFERENCES tasks(id),
    
    allocation_date DATE NOT NULL,
    quantity DECIMAL(10,2),
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resource_allocations_date ON resource_allocations(allocation_date);
CREATE INDEX idx_resource_allocations_user ON resource_allocations(user_id);

-- ==========================================
-- СИСТЕМА ПРЕДСКАЗАНИЯ ПРОБЛЕМ (ML/AI)
-- ==========================================

CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    
    prediction_type VARCHAR(100), -- delay_risk, budget_overrun, quality_issue, safety_risk
    
    entity_type VARCHAR(100), -- project, task, site
    entity_id INTEGER,
    
    confidence_score DECIMAL(5,2), -- 0-100
    
    predicted_issue TEXT,
    recommended_actions JSONB DEFAULT '[]',
    
    prediction_data JSONB,
    
    status VARCHAR(50), -- active, resolved, dismissed
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ==========================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применение триггера ко всем таблицам с updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- ПРЕДСТАВЛЕНИЯ (VIEWS) ДЛЯ БЫСТРОГО ДОСТУПА
-- ==========================================

-- Активные проекты с менеджерами
CREATE VIEW v_active_projects AS
SELECT 
    p.*,
    u.name as manager_name,
    u.email as manager_email,
    COUNT(DISTINCT cs.id) as sites_count,
    COUNT(DISTINCT t.id) as tasks_count
FROM projects p
LEFT JOIN users u ON p.project_manager_id = u.id
LEFT JOIN construction_sites cs ON p.id = cs.project_id AND cs.deleted_at IS NULL
LEFT JOIN tasks t ON p.id = t.project_id AND t.deleted_at IS NULL
WHERE p.status IN (0, 1) -- planning, active
  AND p.deleted_at IS NULL
GROUP BY p.id, u.name, u.email;

-- Текущие задачи с исполнителями
CREATE VIEW v_current_tasks AS
SELECT 
    t.*,
    u.name as assigned_user_name,
    p.name as project_name,
    cs.name as site_name
FROM tasks t
LEFT JOIN users u ON t.assigned_to_user_id = u.id
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN construction_sites cs ON t.construction_site_id = cs.id
WHERE t.status NOT IN (4, 5) -- not completed or cancelled
  AND t.deleted_at IS NULL;

-- Складские остатки
CREATE VIEW v_warehouse_inventory AS
SELECT 
    w.name as warehouse_name,
    m.name as material_name,
    m.code as material_code,
    ws.quantity,
    ws.reserved_quantity,
    ws.available_quantity,
    m.unit,
    m.min_stock_level,
    CASE 
        WHEN ws.quantity <= m.min_stock_level THEN 'low_stock'
        WHEN ws.quantity = 0 THEN 'out_of_stock'
        ELSE 'in_stock'
    END as stock_status
FROM warehouse_stock ws
JOIN warehouses w ON ws.warehouse_id = w.id
JOIN materials m ON ws.material_id = m.id
WHERE w.is_active = TRUE;

-- Финансовая сводка по проектам
CREATE VIEW v_project_financials AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.budget,
    COALESCE(SUM(CASE WHEN pay.payment_type = 'expense' THEN pay.amount ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN pay.payment_type = 'income' THEN pay.amount ELSE 0 END), 0) as total_income,
    p.budget - COALESCE(SUM(CASE WHEN pay.payment_type = 'expense' THEN pay.amount ELSE 0 END), 0) as remaining_budget
FROM projects p
LEFT JOIN payments pay ON p.id = pay.project_id AND pay.status = 1 -- completed
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.budget;

-- Комментарий: успешно создана полная схема БД для CRM системы строителей!
COMMENT ON DATABASE postgres IS 'Строительная CRM система - полная схема базы данных';

 После регистрации логин:
  - Email: admin@crm.local
  - Пароль: Admin123!
 